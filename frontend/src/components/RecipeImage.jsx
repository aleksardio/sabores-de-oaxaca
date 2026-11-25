import { useState } from 'react'
import DishIllustration from './DishIllustration.jsx'

export default function RecipeImage({ image, title, variant = 'detail' }) {
  const [failed, setFailed] = useState(false)
  if (!image || failed) return <DishIllustration label={title} variant={variant} />
  return <img className={variant === 'card' ? 'featured-card__photo' : 'detail-photo'}
    src={image.src} alt={image.alt || `Foto de ${title}`} loading="lazy" width={480} height={variant === 'card' ? 143 : 280}
    referrerPolicy="no-referrer" onError={() => setFailed(true)} />
}
