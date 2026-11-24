import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { DishIllustration } from '../components/RecipeCard.jsx'
import FavoriteButton from '../components/FavoriteButton.jsx'
import FavoritesStatus from '../components/FavoritesStatus.jsx'
import RecipePreparation from '../components/RecipePreparation.jsx'
import RequestError from '../components/RequestError.jsx'
import ServingsCalculator from '../components/ServingsCalculator.jsx'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { getRecipeById, parseRecipeId, recipeTypes } from '../services/recipesService.js'
import { recipeImage } from '../utils/publicRecipePresentation.js'
import '../styles/recipe-detail.css'

function RecipeImage({ image, title }) {
  const [failed, setFailed] = useState(false)
  if (!image || failed) return <DishIllustration label={title} variant="detail" />
  return <img className="detail-photo" src={image.src} alt={image.alt || `Foto de ${title}`}
    referrerPolicy="no-referrer" onError={() => setFailed(true)} />
}

function RecipeIngredients({ recipe }) {
  const { id, porcionesBase, ingredientes } = recipe
  const [servings, setServings] = useState(porcionesBase)
  const isBase = servings === porcionesBase
  const load = useCallback((signal) => getRecipeById(id, servings, signal), [id, servings])
  const adjustment = usePublicRequest(isBase ? null : load)

  return <ServingsCalculator baseServings={porcionesBase} servings={servings} onChange={setServings}
    ingredients={isBase ? ingredientes : adjustment.data?.ingredientes}
    loading={adjustment.loading} error={adjustment.error} onRetry={adjustment.retry} />
}

function BackToCatalog() {
  return <Link to="/recetas">← Volver al catálogo</Link>
}

export default function RecipeDetailPage() {
  const { id: routeId } = useParams()
  const id = parseRecipeId(routeId)
  const load = useCallback((signal) => getRecipeById(id, undefined, signal), [id])
  const { data: recipe, loading, error, retry } = usePublicRequest(id === null ? null : load)

  if (!recipe) {
    const notFound = id === null || error?.status === 404
    return (
      <section className="recipe-detail" aria-labelledby="recipe-detail-title">
        <BackToCatalog />
        <h1 id="recipe-detail-title">{notFound ? 'Receta no encontrada' : 'Detalle de receta'}</h1>
        {loading && <p role="status">Cargando receta…</p>}
        {notFound && <p role="status">No encontramos una receta disponible con ese identificador.</p>}
        {error && !notFound && <RequestError error={error} onRetry={retry} />}
      </section>
    )
  }

  const type = recipeTypes.find(({ value }) => value === recipe.tipo)?.name
  const image = recipeImage(recipe.multimedia)

  return (
    <article className="recipe-detail" aria-labelledby="recipe-detail-title">
      <header className="detail-header">
        <div className="detail-header__links"><BackToCatalog /></div>
        <h1 id="recipe-detail-title">{recipe.titulo}</h1>
        {recipe.autor && <p className="detail-meta">Por {recipe.autor.nombreVisible}</p>}
      </header>

      <div className="detail-grid detail-grid--summary">
        <RecipeImage key={image?.src ?? recipe.id} image={image} title={recipe.titulo} />
        <section className="detail-panel detail-summary" aria-labelledby="detail-summary-title">
          <h2 id="detail-summary-title">Sobre la receta</h2>
          {recipe.descripcion && <p>{recipe.descripcion}</p>}
          {type && <p className="detail-meta">{type}</p>}
          {recipe.categorias.length > 0 && (
            <p className="detail-meta">Categorías: {recipe.categorias.map(({ nombre }) => nombre).join(', ')}</p>
          )}
          <FavoritesStatus />
          <FavoriteButton recipe={recipe} />
        </section>
      </div>

      <div className="detail-grid detail-grid--instructions">
        <RecipeIngredients key={recipe.id} recipe={recipe} />
        <RecipePreparation preparation={recipe.preparacion} />
      </div>
    </article>
  )
}
