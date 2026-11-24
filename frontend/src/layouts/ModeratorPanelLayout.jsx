import { Link, Navigate, NavLink, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { getAuthDestination } from '../utils/authDestination.js'
import { canModerate } from '../utils/moderationAccess.js'
import DemoPanelLayout from './DemoPanelLayout.jsx'
import '../styles/moderation.css'

export default function ModeratorPanelLayout() {
  const { user } = useAuth()
  const { pathname, search, hash } = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: getAuthDestination(pathname + search + hash) }} />
  if (!canModerate(user)) return (
    <main className="cook-main cook-view">
      <h1>Acceso denegado</h1>
      <p>El panel de moderación requiere el rol MODERADOR o ADMIN.</p>
      <div className="cook-actions"><Link className="site-button" to="/perfil">Volver a mi perfil</Link></div>
    </main>
  )

  return (
    <DemoPanelLayout
      className="mod-layout"
      title="Panel de moderación"
      kicker="Moderación"
      navLabel="Panel de moderación"
      notice="Las decisiones sobre recetas pendientes se registran en el servidor. Reportes solo está disponible como demostración."
    >
      <NavLink to="/moderador/recetas">Recetas</NavLink>
      <NavLink to="/moderador/reportes">Reportes (demo)</NavLink>
      <Link to="/perfil">Mi perfil</Link>
      <Link className="site-button" to="/">Sitio público</Link>
    </DemoPanelLayout>
  )
}
