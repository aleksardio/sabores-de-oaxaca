import '../styles/recipe-card.css'

export default function DishIllustration({ label, tone = 'gold', decorative = true, variant }) {
  const variantClass = variant === 'detail' ? ' dish-art--detail' : ''
  return (
    <div className={`dish-art dish-art--${tone}${variantClass}`} aria-hidden={decorative || undefined}>
      <span className="dish-art__plate" />
      <span className="dish-art__dot" />
      <span>{label}</span>
    </div>
  )
}
