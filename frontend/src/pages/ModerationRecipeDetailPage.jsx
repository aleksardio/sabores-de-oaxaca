import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import RecipeDraftPreview from '../components/RecipeDraftPreview.jsx'
import RecipeModerationForm from '../components/RecipeModerationForm.jsx'
import RequestError from '../components/RequestError.jsx'
import { useModeration } from '../hooks/useModeration.js'
import { unavailableRecipe } from '../services/moderationService.js'
import { parseRecipeId } from '../services/recipesService.js'
import { isOwnModerationRecipe } from '../utils/moderationAccess.js'
import { createModerationReview } from '../utils/moderationReview.js'
import { recipeImage } from '../utils/publicRecipePresentation.js'
import { draftFromDetail } from '../utils/recipeEditorValidation.js'

function ReviewDetail({ id, back }) {
  const { user, service } = useModeration()
  const review = useMemo(() => createModerationReview(service, user, id), [service, user, id])
  const state = useSyncExternalStore(review.subscribe, review.getSnapshot)
  const { recipe, receipt, loading, loadError, decisionError, notice } = state
  const unavailable = loadError?.status === 404
  const published = receipt?.estado === 'PUBLICADA'

  useEffect(() => {
    review.load()
    return review.cancel
  }, [review])

  return (
    <section className="cook-view" aria-labelledby="mod-recipe-heading">
      <header>
        <Link className="cook-back" to={back}>← Volver a Revisión de recetas</Link>
        <h1 id="mod-recipe-heading">{recipe?.titulo ?? (unavailable ? 'Receta no disponible' : 'Detalle de receta')}</h1>
        {recipe && (
          <>
            <span className="cook-badge" data-state={receipt?.estado ?? recipe.estado}>
              {receipt ? (published ? 'Publicada' : 'Rechazada') : 'Pendiente'}
            </span>
            <p>Autor: <strong>{recipe.autor}</strong></p>
            <p className="cook-muted">Contenido de solo lectura. Las cantidades corresponden a las porciones base.</p>
          </>
        )}
      </header>
      {notice && <p role="status" className="mod-restriction">{notice}</p>}
      {decisionError && <p role="alert" className="cook-error">{decisionError}</p>}
      {loading && <p role="status">Consultando receta pendiente…</p>}
      {unavailable && <p role="status">{unavailableRecipe}</p>}
      {loadError && !unavailable && <RequestError error={loadError} onRetry={review.load} retryLabel="Volver a consultar" />}
      {receipt && (
        <section className="cook-panel mod-result" aria-label="Resultado de moderación">
          <p role="status" className="cook-check-ok">{published ? 'Receta aprobada correctamente.' : 'Receta rechazada correctamente.'}</p>
          <div className="cook-actions">
            <Link className="site-button" to={back}>Volver a la lista de pendientes</Link>
            {published && <Link className="site-button cook-primary" to={`/recetas/${receipt.id}`}>Ver receta en el catálogo público</Link>}
          </div>
        </section>
      )}
      {recipe && <RecipeDraftPreview recipe={draftFromDetail(recipe)} heading="Vista previa del contenido"
        prefix="mod-preview" image={recipeImage(recipe.multimedia)} showReferences />}
      {!receipt && (recipe || state.reason) && (
        <RecipeModerationForm review={review} state={state} ownRecipe={isOwnModerationRecipe(user, recipe)} />
      )}
    </section>
  )
}

export default function ModerationRecipeDetailPage() {
  const { id: rawId } = useParams()
  const { search } = useLocation()
  const id = parseRecipeId(rawId)
  const back = `/moderador/recetas${search}`
  if (id !== null) return <ReviewDetail key={id} id={id} back={back} />

  return (
    <section className="cook-view">
      <header>
        <Link className="cook-back" to={back}>← Volver a Revisión de recetas</Link>
        <h1>Receta no disponible</h1>
      </header>
      <p role="status">{unavailableRecipe}</p>
    </section>
  )
}
