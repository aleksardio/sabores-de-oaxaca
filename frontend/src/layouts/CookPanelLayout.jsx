import { Link, NavLink, useLocation } from 'react-router'
import DemoPanelLayout from './DemoPanelLayout.jsx'
import { useAuth } from '../auth/useAuth.js'
import { getAuthDestination } from '../utils/authDestination.js'
import { canWriteRecipes } from '../utils/cookRecipeRules.js'

export default function CookPanelLayout() {
  const { user, notice } = useAuth()
  const { pathname, search } = useLocation()
  if (!user) return (
    <main className="cook-main cook-view">
      <h1>Mis recetas</h1>
      <p role="status">{notice || 'Inicia sesión para consultar tus recetas.'}</p>
      <div className="cook-actions">
        <Link className="site-button site-button--green" to="/login" state={{ from: getAuthDestination(pathname + search) }}>Iniciar sesión</Link>
        <Link className="site-button" to="/">Ir al sitio público</Link>
      </div>
    </main>
  )

  const writable = canWriteRecipes(user)
  return (
    <DemoPanelLayout
      key={user.id}
      title="Panel del cocinero"
      kicker="Mi cocina"
      navLabel="Panel del cocinero"
      notice={writable ? `Recetas de ${user.nombreVisible}` : 'Modo lectura: se requiere el rol COCINERO para gestionar recetas.'}
    >
      <NavLink to="/cocinero/recetas" end>Mis recetas</NavLink>
      {writable && <NavLink to="/cocinero/recetas/nueva">Crear receta</NavLink>}
      <Link className="site-button" to="/">Ir al sitio público</Link>
    </DemoPanelLayout>
  )
}
