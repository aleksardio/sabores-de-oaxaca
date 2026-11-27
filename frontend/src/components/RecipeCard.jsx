import { Link } from 'react-router'
import { recipeTypes } from '../services/recipesService.js'
import { splitRecipeDescription } from '../utils/recipeDescription.js'
import RecipeImage from './RecipeImage.jsx'
import '../styles/recipe-card.css'

export default function RecipeCard({ recipe, image, favoriteAction }) {
  const { id, titulo, descripcion, tipo, autor, categorias } = recipe
  const type = recipeTypes.find(({ value }) => value === tipo)?.name
  const { excerpt } = splitRecipeDescription(descripcion)
  return (
    <li className="featured-card">
      <RecipeImage key={image?.src} image={image} title={titulo} variant="card" />
      {(type || categorias.length > 0) && (
        <div className="featured-card__tags">
          {type && <span data-recipe-type={tipo}>{type}</span>}
          {categorias.map(({ id, nombre }) => <span className="featured-card__category" key={id}>{nombre}</span>)}
        </div>
      )}
      <h3>{titulo}</h3>
      {excerpt && <p className="featured-card__description">{excerpt}</p>}
      {autor && <small>Por {autor.nombreVisible}</small>}
      <div className="featured-card__actions">
        <Link className="site-button site-button--clay featured-card__link" to={`/recetas/${id}`} aria-label={`Ver receta de ${titulo}`}>
          Ver receta <span aria-hidden="true">→</span>
        </Link>
        {favoriteAction}
      </div>
    </li>
  )
}
