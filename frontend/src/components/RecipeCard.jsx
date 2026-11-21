import { Link } from 'react-router'
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

export default function RecipeCard({ id, title, description, region, time, tone }) {
  return (
    <li className="featured-card">
      <DishIllustration label={title} tone={tone} />
      <div className="featured-card__tags">
        <span>{region}</span>
        <span>{time}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="site-button featured-card__link" to={`/recetas/${id}`} aria-label={`Ver receta de ${title}`}>
        Ver receta <span aria-hidden="true">→</span>
      </Link>
    </li>
  )
}
