import { isPendingReport, reportDecisions } from './reportRules.js'

export function createReportReview(service, id) {
  let state = { loading: true, report: null, loadError: null, decisionError: null, notice: '', confirmed: false,
    confirmation: null, busy: false, forbidden: false }
  let query
  let writing = false
  let active = false
  const listeners = new Set()

  function update(changes) {
    state = { ...state, ...changes }
    listeners.forEach((listener) => listener())
  }

  async function load() {
    if (writing) return
    active = true
    query?.abort()
    const controller = new AbortController()
    query = controller
    update({ loading: true, report: null, loadError: null, confirmation: null, forbidden: false })
    try {
      const report = await service.detail(id, controller.signal)
      if (!controller.signal.aborted) update({ report, loading: false })
    } catch (error) {
      if (!controller.signal.aborted && error.name !== 'AbortError') update({ loadError: error, loading: false })
    } finally {
      if (query === controller) query = undefined
    }
  }

  const canDecide = () => active && !writing && !state.busy && !state.forbidden && isPendingReport(state.report)

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    load,
    cancel() {
      active = false
      query?.abort()
    },
    prepare(action) {
      if (canDecide() && !state.confirmation && Object.hasOwn(reportDecisions, action)) {
        update({ confirmation: action, decisionError: null })
      }
    },
    dismiss() {
      update({ confirmation: null })
    },
    async confirm() {
      const { report, confirmation } = state
      if (!confirmation || !canDecide()) return
      writing = true
      update({ busy: true, confirmation: null, decisionError: null, notice: '' })
      try {
        const result = await service.decide(report, confirmation, { confirmed: true })
        if (active) update({
          report: result.report ?? null, loadError: result.error ?? null,
          notice: result.notice ?? '', confirmed: Boolean(result.confirmed),
        })
      } catch (error) {
        if (!active || error.name === 'AbortError') return
        if (error.status === 409) {
          // El bloqueo compartido detectó otra escritura de esta sesión: esperar y consultar.
          update({ report: null, notice: error.message })
          writing = false
          await load()
        } else if (error.status === 404) {
          update({ report: null, loadError: error })
        } else {
          update({ decisionError: error, forbidden: error.status === 401 || error.status === 403 })
        }
      } finally {
        writing = false
        if (active) update({ busy: false })
      }
    },
  }
}
