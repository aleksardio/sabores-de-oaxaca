import { Link } from 'react-router'
import { recipeTypes } from '../services/recipesService.js'
import RecipeImage from './RecipeImage.jsx'
import '../styles/recipe-card.css'

export default function RecipeCard({ recipe, image, favoriteAction }) {
  const { id, titulo, descripcion, tipo, autor, categorias } = recipe
  const type = recipeTypes.find(({ value }) => value === tipo)?.name
  return (
    <li className="featured-card">
      <RecipeImage key={image?.src} image={image} title={titulo} variant="card" />
      {(type || categorias.length > 0) && (
        <div className="featured-card__tags">
          {type && <span>{type}</span>}
          {categorias.map(({ id, nombre }) => <span key={id}>{nombre}</span>)}
        </div>
      )}
      <h3>{titulo}</h3>
      {descripcion && <p>{descripcion}</p>}
      {autor && <small>Por {autor.nombreVisible}</small>}
      <Link className="site-button featured-card__link" to={`/recetas/${id}`} aria-label={`Ver receta de ${titulo}`}>
        Ver receta <span aria-hidden="true">→</span>
      </Link>
      {favoriteAction}
    </li>
  )
}
