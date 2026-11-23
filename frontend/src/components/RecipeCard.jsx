import { Link } from 'react-router'
import { recipeTypes } from '../services/recipesService.js'
import '../styles/recipe-card.css'

// Recreates the editable shapes and gradients in Figma without using photos.
export function DishIllustration({ label, tone = 'gold', decorative = true, variant }) {
  const variantClass = variant === 'detail' ? ' dish-art--detail' : ''
  return (
    <div className={`dish-art dish-art--${tone}${variantClass}`} aria-hidden={decorative || undefined}>
      <span className="dish-art__plate" />
      <span className="dish-art__dot" />
      <span>{label}</span>
    </div>
  )
}

export default function RecipeCard({ recipe }) {
  const { id, titulo, descripcion, tipo, autor, categorias } = recipe
  const type = recipeTypes.find(({ value }) => value === tipo)?.name
  return (
    <li className="featured-card">
      <DishIllustration label={titulo} />
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
    </li>
  )
}
