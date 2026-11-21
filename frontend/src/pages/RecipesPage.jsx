import { Link } from 'react-router'
import { recipes } from '../data/recipes.js'

export default function RecipesPage() {
  return (
    <section>
      <h1>Catálogo de recetas</h1>
      <p>Selección provisional con ejemplos locales.</p>
      <ul className="recipe-grid">
        {recipes.map((recipe) => (
          <li className="card" key={recipe.id}>
            <h2><Link to={`/recetas/${recipe.id}`}>{recipe.name}</Link></h2>
            <p>{recipe.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
