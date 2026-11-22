import { Link, useParams } from 'react-router'
import ModerationDecisionForm from '../components/ModerationDecisionForm.jsx'
import RecipeDraftPreview from '../components/RecipeDraftPreview.jsx'
import { demoReviewerId, findDemoModerationRecipe, moderationRecipeStates } from '../data/demoModerationRecipes.js'
import { getRecipeModeration } from '../utils/moderationRules.js'

export default function ModerationRecipeDetailPage() {
  const { id } = useParams()
  const recipe = findDemoModerationRecipe(id)

  return (
    <section className="cook-view" aria-labelledby="mod-recipe-heading">
      <header>
        <Link className="cook-back" to="/moderador/recetas">← Volver a Revisión de recetas</Link>
        <h1 id="mod-recipe-heading">{recipe?.title ?? 'Receta no encontrada'}</h1>
        {recipe && (
          <>
            <span className="cook-badge" data-state={recipe.state}>{moderationRecipeStates[recipe.state]}</span>
            <p>Autor ficticio: <strong>{recipe.author.name}</strong></p>
            <p className="cook-muted">Contenido de solo lectura. La autoría de prueba se comprueba con una referencia local, no con una sesión autenticada.</p>
          </>
        )}
      </header>
      {!recipe
        ? <p className="cook-muted">No hay una receta de demostración con ese identificador.</p>
        : (
          <>
            <RecipeDraftPreview recipe={recipe} heading="Vista previa del contenido" />
            <ModerationDecisionForm
              key={recipe.id}
              kind="recipe"
              record={recipe}
              reviewerId={demoReviewerId}
              moderation={getRecipeModeration(recipe, demoReviewerId)}
              states={moderationRecipeStates}
            />
          </>
        )}
    </section>
  )
}
