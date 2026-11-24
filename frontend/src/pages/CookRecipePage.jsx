import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import RecipeDraftPreview from '../components/RecipeDraftPreview.jsx'
import RecipeEditorForm from '../components/RecipeEditorForm.jsx'
import RequestError from '../components/RequestError.jsx'
import { useCookRecipes } from '../hooks/useCookRecipes.js'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { getCategories, getIngredients, parseRecipeId } from '../services/recipesService.js'
import { canDeleteRecipe, canEditRecipe, canReviewRecipe, canWriteRecipes, recipeStates } from '../utils/cookRecipeRules.js'
import { blankDraft, draftFromDetail, toRecipeBody, validateRecipeDraft, validateRecipeForReview } from '../utils/recipeEditorValidation.js'
import { createRecipeOperation, resolveRecipeConflict, saveAndRequestReview } from '../utils/cookRecipeActions.js'

const listPath = '/cocinero/recetas'
const editPath = (id) => `${listPath}/${id}/editar`

function BackToList() {
  return <Link className="cook-back" to={listPath}>← Volver a Mis recetas</Link>
}

function RecipeStatus({ record }) {
  return (
    <>
      <span className="cook-badge" data-state={record.estado}>{recipeStates[record.estado]}</span>
      {record.eliminadoEn !== null && <p className="cook-muted">Dada de baja. El estado editorial se conserva.</p>}
    </>
  )
}

function ConflictPanel({ draft, record, server, pending, loadError, onLoad, onResolve, editable }) {
  return (
    <section className="cook-panel cook-view" aria-labelledby="cook-conflict-title">
      <div>
        <h2 id="cook-conflict-title">Conflicto de versión o estado</h2>
        <p>La operación no se reintentó. Tus datos de esta pantalla se conservan.</p>
        <button className="site-button" type="button" disabled={pending} onClick={onLoad}>Consultar versión del servidor</button>
        {loadError && <p role="alert">{loadError.message}</p>}
      </div>
      {server && (
        <>
          <div className="cook-editor-grid">
            <div>
              <h3>{editable ? 'Datos locales' : 'Detalle anterior'} (versión {record.version})</h3>
              <RecipeStatus record={record} />
              <RecipeDraftPreview recipe={draft} prefix="cook-local" showReferences />
            </div>
            <div>
              <h3>Servidor (versión {server.version})</h3>
              <RecipeStatus record={server} />
              <RecipeDraftPreview recipe={draftFromDetail(server)} prefix="cook-server" showReferences />
            </div>
          </div>
          <p>Revisa ambas versiones. Ninguna de estas opciones escribe en el servidor.</p>
          <div className="cook-actions">
            {editable && <button className="site-button" type="button" disabled={pending} onClick={() => onResolve(true)}>
              Conservar mis datos y adoptar la versión del servidor
            </button>}
            <button className="site-button" type="button" disabled={pending} onClick={() => onResolve(false)}>
              {editable ? 'Descartar mis datos y usar los del servidor' : 'Usar el detalle del servidor'}
            </button>
          </div>
          {editable && <p className="cook-muted">Si conservas tus datos, un nuevo guardado reemplazará el contenido completo si el estado vigente permite editar.</p>}
        </>
      )}
    </section>
  )
}

function RecipeWorkspace({ mode, initialRecipe, user, service, created }) {
  const navigate = useNavigate()
  const [record, setRecord] = useState(initialRecipe)
  const [baseline, setBaseline] = useState(() => initialRecipe ? draftFromDetail(initialRecipe) : blankDraft)
  const [draft, setDraft] = useState(baseline)
  const [preview, setPreview] = useState(false)
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState(created ? 'Borrador creado.' : '')
  const [conflict, setConflict] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletionConfirmed, setDeletionConfirmed] = useState(false)
  const [refreshError, setRefreshError] = useState(null)
  const [operation] = useState(createRecipeOperation)
  const confirmHeading = useRef(null)
  useLayoutEffect(() => () => operation.cancel(), [operation])
  useLayoutEffect(() => {
    if (confirmDelete) confirmHeading.current?.focus()
  }, [confirmDelete])

  const creating = mode === 'create'
  const editing = mode === 'edit' && canEditRecipe(user, record) && !deletionConfirmed
  const formAvailable = creating || editing
  const dirty = draft !== baseline
  const categories = usePublicRequest(formAvailable ? getCategories : null)
  const ingredients = usePublicRequest(formAvailable ? getIngredients : null)

  async function run(action, onError) {
    const attempt = operation.start()
    if (!attempt) return
    setPending(true)
    try {
      await action(attempt.signal)
    } catch (error) {
      if (!attempt.signal.aborted && error.name !== 'AbortError') onError(error)
    } finally {
      operation.finish(attempt)
      if (!attempt.signal.aborted) setPending(false)
    }
  }

  function writeFailed(error) {
    setFailure(error)
    if (error.status === 409 && record) setConflict({})
  }

  function save(review = false) {
    if (pending || conflict || confirmDelete || !formAvailable || (review && !canReviewRecipe(user, record))) return
    const validation = review ? validateRecipeForReview(draft, record) : validateRecipeDraft(draft)
    setErrors(validation)
    if (Object.keys(validation).length) return
    run(async (signal) => {
      setFailure(null)
      setNotice('')
      const body = toRecipeBody(draft)
      if (creating) {
        const saved = await service.create(body, signal)
        navigate(editPath(saved.id), { replace: true, state: { createdId: saved.id } })
        return
      }
      if (review) {
        const changedBody = dirty && JSON.stringify(body) !== JSON.stringify(toRecipeBody(baseline)) ? body : null
        const saved = await saveAndRequestReview(service, record, changedBody, signal, (updated) => {
          setRecord(updated)
          setBaseline(draft)
          setNotice('Cambios guardados. El envío a revisión aún no se ha confirmado.')
        })
        if (!saved) return
        setRecord({ ...record, ...saved })
        setBaseline(draft)
        setPreview(false)
        setNotice('Receta enviada a revisión. Está pendiente, no publicada.')
        return
      }
      const saved = await service.update(record.id, body, record.version, signal)
      setRecord({ ...record, ...saved })
      setBaseline(draft)
      setNotice('Cambios guardados.')
    }, writeFailed)
  }

  async function refreshDeleted(signal) {
    setRefreshError(null)
    const fresh = await service.detail(record.id, signal)
    setRecord(fresh)
    const nextDraft = draftFromDetail(fresh)
    setDraft(nextDraft)
    setBaseline(nextDraft)
  }

  function remove() {
    if (!confirmDelete || pending || conflict || deletionConfirmed || !canDeleteRecipe(user, record)) return
    run(async (signal) => {
      setFailure(null)
      setNotice('')
      setConfirmDelete(false)
      await service.remove(record.id, record.version, signal)
      setDeletionConfirmed(true)
      setNotice('Baja confirmada por el servidor.')
      try {
        await refreshDeleted(signal)
      } catch (error) {
        if (!signal.aborted && error.name !== 'AbortError') setRefreshError(error)
      }
    }, writeFailed)
  }

  function loadConflict() {
    run(async (signal) => {
      setConflict({})
      setConflict({ server: await service.detail(record.id, signal) })
    }, (error) => setConflict({ error }))
  }

  function resolveConflict(keepLocal) {
    const { server } = conflict
    const next = resolveRecipeConflict(draft, draftFromDetail(server), keepLocal)
    setRecord(server)
    setBaseline(next.baseline)
    setDraft(next.draft)
    setErrors({})
    setFailure(null)
    setConflict(null)
    setNotice(keepLocal ? 'Datos locales conservados; no se han reenviado.' : 'Detalle del servidor cargado.')
  }

  return (
    <section className="cook-view" aria-labelledby="cook-workspace-title" aria-busy={pending}>
      <header>
        <BackToList />
        <h1 id="cook-workspace-title">{creating ? 'Crear receta' : editing ? 'Editar receta' : 'Detalle de la receta'}</h1>
        {record && <RecipeStatus record={record} />}
        {record?.estado === 'RECHAZADA' && canReviewRecipe(user, record) && !deletionConfirmed &&
          <p className="cook-muted">Puedes corregir esta receta y enviarla nuevamente a revisión.</p>}
        {dirty && formAvailable && <p className="cook-muted">Hay cambios sin guardar.</p>}
      </header>
      {pending && <p role="status">Operación en curso…</p>}
      {notice && <p className="cook-check-ok" role="status">{notice}</p>}
      {failure && <p className="cook-error" role="alert">{failure.message}</p>}
      {refreshError && <RequestError error={refreshError} retryLabel="Consultar detalle de nuevo" onRetry={() => run(refreshDeleted, setRefreshError)} />}
      {conflict && (
        <ConflictPanel draft={draft} record={record} server={conflict.server} pending={pending} loadError={conflict.error}
          onLoad={loadConflict} onResolve={resolveConflict} editable={editing} />
      )}
      {formAvailable && (
        <div className="cook-actions cook-mode" role="group" aria-label="Modo de la receta">
          <button className="site-button" type="button" disabled={pending} aria-pressed={!preview} onClick={() => setPreview(false)}>Editar</button>
          <button className="site-button" type="button" disabled={pending} aria-pressed={preview} onClick={() => setPreview(true)}>Vista previa</button>
        </div>
      )}
      {!formAvailable || preview ? <RecipeDraftPreview recipe={formAvailable ? draft : baseline} /> : (
        <RecipeEditorForm draft={draft} onChange={setDraft} errors={errors} pending={pending} blocked={Boolean(conflict || confirmDelete)}
          creating={creating} categories={categories} ingredients={ingredients} onSave={() => save()}
          onReview={canReviewRecipe(user, record) ? () => save(true) : null}
          reviewLabel={record?.estado === 'RECHAZADA' ? 'Reenviar a revisión' : 'Enviar a revisión'} />
      )}
      {!formAvailable && dirty && !deletionConfirmed && (
        <details className="cook-panel">
          <summary>Ver mis cambios locales no guardados</summary>
          <RecipeDraftPreview recipe={draft} prefix="cook-unsaved" showReferences />
        </details>
      )}
      {!formAvailable && record && (
        <div className="cook-actions">
          {!deletionConfirmed && !conflict && canEditRecipe(user, record) && mode !== 'edit' &&
            <Link className="site-button cook-primary" to={editPath(record.id)}>Editar receta</Link>}
          {!deletionConfirmed && !conflict && canDeleteRecipe(user, record) && !confirmDelete &&
            <button className="site-button" type="button" disabled={pending} onClick={() => setConfirmDelete(true)}>Dar de baja</button>}
        </div>
      )}
      {editing && !conflict && !confirmDelete && (
        <div><button className="site-button" type="button" disabled={pending} onClick={() => setConfirmDelete(true)}>Dar de baja</button></div>
      )}
      {confirmDelete && (
        <section className="cook-panel" aria-labelledby="cook-confirm-delete">
          <h2 ref={confirmHeading} tabIndex={-1} id="cook-confirm-delete">Confirmar baja</h2>
          <p>Se dará de baja «{baseline.title}» sin cambiar su estado editorial. No se puede restaurar desde este panel.
            {dirty && ' Se descartarán los cambios sin guardar si la baja se confirma.'}</p>
          <div className="cook-actions">
            <button className="site-button" type="button" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            <button className="site-button cook-primary" type="button" disabled={pending || Boolean(conflict)} onClick={remove}>Confirmar baja de la receta</button>
          </div>
        </section>
      )}
    </section>
  )
}

export default function CookRecipePage({ mode }) {
  const { id } = useParams()
  const { state } = useLocation()
  const recipeId = parseRecipeId(id)
  const { user, service } = useCookRecipes()
  const load = useCallback((signal) => service.detail(recipeId, signal), [service, recipeId])
  const { data, error, loading, retry } = usePublicRequest(recipeId && mode !== 'create' ? load : null)
  if (mode === 'create' && canWriteRecipes(user)) return <RecipeWorkspace key="new" mode={mode} user={user} service={service} />
  if (data) return <RecipeWorkspace key={`${recipeId}-${mode}`} mode={mode} initialRecipe={data} user={user} service={service}
    created={state?.createdId === recipeId} />

  return (
    <section className="cook-view">
      <BackToList />
      {mode === 'create' ? <p role="alert">Acceso denegado. Se requiere el rol COCINERO para crear una receta.</p>
        : !recipeId ? <p role="alert">Receta no encontrada.</p>
          : loading ? <p role="status">Cargando detalle…</p>
            : error && <RequestError error={error} onRetry={retry} />}
    </section>
  )
}
