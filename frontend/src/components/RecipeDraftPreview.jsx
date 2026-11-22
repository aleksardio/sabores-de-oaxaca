import { ingredientUnits, recipeTypes } from '../data/recipeEditorOptions.js'
import { DishIllustration } from './RecipeCard.jsx'
import RecipePreparation from './RecipePreparation.jsx'
import '../styles/recipe-detail.css'

export default function RecipeDraftPreview({ recipe }) {
  const ingredients = recipe.ingredients.filter(({ name, quantity, note }) => name.trim() || quantity || note.trim())

  return (
    <article className="recipe-detail cook-preview" aria-labelledby="cook-preview-recipe">
      <DishIllustration label="Ilustración de la receta" variant="detail" />
      <ul className="cook-preview-meta" role="list" aria-label="Datos de la receta">
        <li className="detail-badge">{recipeTypes[recipe.type] || 'Sin tipo'}</li>
        <li className="detail-badge">Porciones: {recipe.baseServings.trim() || 'sin indicar'}</li>
        {recipe.categories.length === 0 && <li className="detail-badge">Sin categorías</li>}
        {recipe.categories.map((category) => <li key={category} className="detail-badge">{category}</li>)}
      </ul>
      <header>
        <h2 id="cook-preview-recipe">{recipe.title.trim() || 'Receta sin título'}</h2>
        <p className="cook-preview-description">{recipe.description.trim() || 'Aún no hay descripción.'}</p>
      </header>
      <div className="detail-grid detail-grid--instructions">
        <section className="detail-panel detail-ingredients" aria-labelledby="cook-preview-ingredients">
          <h2 id="cook-preview-ingredients">Ingredientes</h2>
          {ingredients.length ? (
            <ul className="detail-ingredient-list" role="list">
              {ingredients.map(({ id, name, quantity, unit, note }) => (
                <li key={id}>
                  <div>
                    {name.trim() || 'Ingrediente sin nombre'}
                    {note.trim() && <span className="detail-ingredient-note">{note}</span>}
                  </div>
                  <strong>{unit === 'AL_GUSTO' ? 'Al gusto' : `${quantity?.replace('.', ',') || '—'} ${ingredientUnits[unit] || ''}`}</strong>
                </li>
              ))}
            </ul>
          ) : <p>Aún no hay ingredientes.</p>}
        </section>
        <RecipePreparation preparation={recipe.preparation} />
      </div>
    </article>
  )
}
