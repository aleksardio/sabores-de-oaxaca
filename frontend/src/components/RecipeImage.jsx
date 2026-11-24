import { useState } from 'react'
import { DishIllustration } from './RecipeCard.jsx'

export default function RecipeImage({ image, title }) {
  const [failed, setFailed] = useState(false)
  if (!image || failed) return <DishIllustration label={title} variant="detail" />
  return <img className="detail-photo" src={image.src} alt={image.alt || `Foto de ${title}`}
    referrerPolicy="no-referrer" onError={() => setFailed(true)} />
}
