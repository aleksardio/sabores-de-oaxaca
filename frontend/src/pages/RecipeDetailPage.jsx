import { Link, useParams } from 'react-router'
import { DishIllustration } from '../components/RecipeCard.jsx'
import ServingsCalculator from '../components/ServingsCalculator.jsx'
import { recipes } from '../data/recipes.js'
import '../styles/recipe-detail.css'

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${minutes} min`
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`
}

export default function RecipeDetailPage() {
  const { id } = useParams()
  const recipe = recipes.find((item) => item.id === id)

  if (!recipe) {
    return (
      <section className="recipe-detail" aria-labelledby="recipe-detail-title">
        <h1 id="recipe-detail-title">Receta no encontrada</h1>
        <p>No hay una receta con ese identificador en el catálogo provisional.</p>
        <Link to="/recetas">Volver al catálogo</Link>
      </section>
    )
  }

  const steps = recipe.preparation.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  return (
    <article className="recipe-detail" aria-labelledby="recipe-detail-title">
      <header className="detail-header">
        <div className="detail-header__links">
          <Link to="/recetas">← Volver al catálogo</Link>
          <span className="detail-badge detail-badge--demo">Receta de demostración</span>
        </div>
        <h1 id="recipe-detail-title">{recipe.name}</h1>
        <p className="detail-meta">{recipe.region} · Tiempo total: {formatDuration(recipe.durationMinutes)}</p>
      </header>

      <div className="detail-grid detail-grid--summary">
        <DishIllustration label="Ilustración de la receta" variant="detail" />
        <section className="detail-panel detail-summary" aria-labelledby="detail-summary-title">
          <h2 id="detail-summary-title">Sobre la receta</h2>
          <p>{recipe.description}</p>
          <p className="detail-meta">{recipe.category} · {recipe.traditional ? 'Cocina tradicional' : 'Receta común'}</p>
        </section>
      </div>

      <div className="detail-grid detail-grid--instructions">
        <ServingsCalculator key={recipe.id} baseServings={recipe.baseServings} ingredients={recipe.ingredientDetails} />
        <section className="detail-panel detail-preparation" aria-labelledby="detail-preparation-title">
          <h2 id="detail-preparation-title">Preparación paso a paso</h2>
          <ol className="detail-steps" role="list">
            {steps.map((step, index) => (
              <li key={index}>
                <span className="detail-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <p className="detail-demo-note">Las cantidades y la preparación son ilustrativas; no representan una receta histórica verificada.</p>
    </article>
  )
}
