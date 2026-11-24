import { ingredientUnits, mediaTypes, recipeTypes } from '../data/recipeEditorOptions.js'
import { isHttpsMediaUrl } from '../utils/recipeEditorValidation.js'
import { DishIllustration } from './RecipeCard.jsx'
import RecipeImage from './RecipeImage.jsx'
import RecipePreparation from './RecipePreparation.jsx'
import '../styles/recipe-detail.css'

export default function RecipeDraftPreview({ recipe, heading, prefix = 'cook-preview', showReferences = false, image }) {
  const byOrder = (a, b) => Number(a.order) - Number(b.order)
  const ingredients = recipe.ingredients.filter(({ name, ingredientId, quantity, note }) =>
    showReferences || name.trim() || ingredientId || quantity || note.trim()).sort(byOrder)

  return (
    <article className="recipe-detail cook-preview" aria-labelledby={`${prefix}-recipe`}>
      {image === undefined
        ? <DishIllustration label="Ilustración de la receta" variant="detail" />
        : <RecipeImage key={image?.src} image={image} title={recipe.title} />}
      <ul className="cook-preview-meta" role="list" aria-label="Datos de la receta">
        <li className="detail-badge">{recipeTypes[recipe.type] || 'Sin tipo'}</li>
        <li className="detail-badge">Porciones: {recipe.baseServings.trim() || 'sin indicar'}</li>
        {recipe.categories.length === 0 && <li className="detail-badge">Sin categorías</li>}
        {recipe.categories.map((category) => typeof category === 'string'
          ? <li key={category} className="detail-badge">{category}</li>
          : <li key={category.id} className="detail-badge">{category.nombre}{showReferences && ` (ID ${category.id})`}</li>)}
      </ul>
      <header>
        <h2 id={`${prefix}-recipe`}>{heading ?? (recipe.title.trim() || 'Receta sin título')}</h2>
        <p className="cook-preview-description">{recipe.description.trim() || 'Aún no hay descripción.'}</p>
      </header>
      <div className="detail-grid detail-grid--instructions">
        <section className="detail-panel detail-ingredients" aria-labelledby={`${prefix}-ingredients`}>
          <h2 id={`${prefix}-ingredients`}>Ingredientes</h2>
          {ingredients.length ? (
            <ul className="detail-ingredient-list" role="list">
              {ingredients.map(({ id, ingredientId, name, quantity, unit, note, order }) => (
                <li key={id}>
                  <div>
                    {name.trim() || (ingredientId ? `Ingrediente ID ${ingredientId}` : 'Ingrediente sin identificar')}
                    {showReferences && <span className="detail-ingredient-note">ID: {ingredientId || '—'} · Orden: {order || '—'}</span>}
                    {note.trim() && <span className="detail-ingredient-note">{note}</span>}
                  </div>
                  <strong>{unit === 'AL_GUSTO' ? 'Al gusto' : `${quantity?.replace('.', ',') || '—'} ${ingredientUnits[unit] || ''}`}</strong>
                </li>
              ))}
            </ul>
          ) : <p>Aún no hay ingredientes.</p>}
        </section>
        <RecipePreparation preparation={recipe.preparation} titleId={`${prefix}-preparation`} />
      </div>
      {recipe.multimedia?.length > 0 && (
        <section className="detail-panel" aria-labelledby={`${prefix}-media`}>
          <h2 id={`${prefix}-media`}>Referencias multimedia</h2>
          <ul>
            {recipe.multimedia.slice().sort(byOrder).map(({ id, url, type, alt, order }) => (
              <li key={id}>
                {mediaTypes[type] || 'Sin tipo'} (orden {order || '—'}):{' '}
                {isHttpsMediaUrl(url) && !showReferences
                  ? <a href={url} target="_blank" rel="noreferrer">{alt || url} (abre en otra pestaña)</a>
                  : <span>{url || 'Sin URL'}{alt && ` · ${alt}`}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
