import { useId, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { getAuthDestination } from '../utils/authDestination.js'
import { canWriteRecipes } from '../utils/cookRecipeRules.js'

const destination = getAuthDestination('/cocinero/recetas/nueva')

export default function ShareRecipeAction({ children, className }) {
  const { user } = useAuth()
  const [showNotice, setShowNotice] = useState(false)
  const noticeId = useId()

  if (!user) return <Link className={className} to="/login" state={{ from: destination }}>{children}</Link>
  if (canWriteRecipes(user)) return <Link className={className} to={destination}>{children}</Link>
  return (
    <div className="share-recipe">
      <button className={className} type="button" aria-expanded={showNotice} aria-controls={noticeId}
        onClick={() => setShowNotice((previous) => !previous)}>{children}</button>
      <p id={noticeId} role="status">
        {showNotice && 'Necesitas el rol COCINERO para compartir recetas. Puedes solicitarlo a un administrador.'}
      </p>
    </div>
  )
}
