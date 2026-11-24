import { canModerate, isOwnModerationRecipe, validateRejectionReason } from './moderationAccess.js'

// One review per session/detail. State changes synchronously, before React paints.
export function createModerationReview(service, user, id) {
  let snapshot = {
    recipe: null, loading: true, loadError: null, decisionError: '', notice: '', busy: false,
    blocked: false, confirmation: null, reason: '', reasonError: '', receipt: null,
  }
  let query
  let submission
  const listeners = new Set()

  function update(changes) {
    snapshot = { ...snapshot, ...changes }
    for (const listener of listeners) listener()
  }

  async function load() {
    if (submission || snapshot.receipt) return
    query?.abort()
    const controller = new AbortController()
    query = controller
    update({ loading: true, loadError: null, recipe: null, confirmation: null, blocked: false })
    try {
      const recipe = await service.detail(id, controller.signal)
      if (!controller.signal.aborted) update({ loading: false, recipe })
    } catch (error) {
      if (!controller.signal.aborted) update({ loading: false, loadError: error })
    } finally {
      if (query === controller) query = undefined
    }
  }

  function canDecide() {
    return canModerate(user) && snapshot.recipe?.estado === 'PENDIENTE'
      && !isOwnModerationRecipe(user, snapshot.recipe) && !snapshot.blocked && !snapshot.busy && !snapshot.receipt
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    load,
    cancel() {
      query?.abort()
      submission?.abort()
    },
    setReason(reason) {
      if (!snapshot.busy) update({ reason, reasonError: '', confirmation: null })
    },
    prepare(action) {
      if (!canDecide() || !['approve', 'reject'].includes(action)) return
      const reasonError = action === 'reject' ? validateRejectionReason(snapshot.reason) : ''
      update({ confirmation: reasonError ? null : action, reasonError, decisionError: '' })
    },
    dismiss() {
      update({ confirmation: null })
    },
    async confirm() {
      const { confirmation, reason, recipe } = snapshot
      if (submission || !confirmation || !canDecide()) return
      const controller = new AbortController()
      submission = controller
      update({ busy: true, confirmation: null, decisionError: '', notice: '' })
      let verify = false
      try {
        // Salir de la vista descarta su resultado, pero no da por cancelada una escritura ya enviada.
        const receipt = confirmation === 'approve'
          ? await service.approve(recipe)
          : await service.reject(recipe, reason)
        if (!controller.signal.aborted) update({ receipt })
      } catch (error) {
        if (controller.signal.aborted) return
        const { status } = error
        verify = status === 409 || !status || status >= 500 || (status >= 200 && status < 300)
        if (verify) {
          update({
            recipe: null,
            notice: status === 409
              ? 'La receta cambió o no admite la operación. Si sigue pendiente, revisa los datos y confirma una nueva decisión.'
              : 'No se pudo confirmar el resultado de la decisión. Se consultará el detalle antes de permitir otra.',
            decisionError: status === 409 ? '' : error.message,
          })
        } else if (status === 404) {
          update({ recipe: null, loadError: error })
        } else {
          update({ decisionError: error.message, blocked: status === 401 || status === 403 })
        }
      } finally {
        submission = undefined
        if (!controller.signal.aborted) update({ busy: false })
      }
      if (verify && !controller.signal.aborted) await load()
    },
  }
}
