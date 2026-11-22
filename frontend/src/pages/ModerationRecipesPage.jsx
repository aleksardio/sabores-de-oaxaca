import { Link } from 'react-router'
import ModerationQueue from '../components/ModerationQueue.jsx'
import { demoModerationRecipes, demoReviewerId, moderationRecipeStates } from '../data/demoModerationRecipes.js'

export default function ModerationRecipesPage() {
  return (
    <section className="cook-view" aria-labelledby="mod-recipes-heading">
      <header>
        <p className="mod-eyebrow">Cola editorial</p>
        <h1 id="mod-recipes-heading">Revisión de recetas</h1>
        <p className="cook-muted">Explora recetas ficticias fuera del catálogo público. Solo las pendientes de otro autor admiten aprobación o rechazo.</p>
      </header>
      <ModerationQueue
        title="Recetas de ejemplo"
        items={demoModerationRecipes}
        states={moderationRecipeStates}
        searchLabel="Buscar por título"
        renderItem={(recipe) => (
          <>
            <div className="mod-card-heading">
              <h3>{recipe.title}</h3>
              <span className="cook-badge" data-state={recipe.state}>{moderationRecipeStates[recipe.state]}</span>
            </div>
            <p className="cook-muted">Autor: {recipe.author.name}</p>
            {recipe.author.id === demoReviewerId && <p className="mod-card-note">Coincide con la referencia de prueba</p>}
            <Link className="site-button" to={recipe.id} aria-label={`Ver receta: ${recipe.title}`}>Ver receta <span aria-hidden="true">→</span></Link>
          </>
        )}
      />
    </section>
  )
}
