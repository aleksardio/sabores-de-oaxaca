import { Link, Navigate, NavLink, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { canAdminister } from '../utils/adminAccess.js'
import { getAuthDestination } from '../utils/authDestination.js'
import { canModerate } from '../utils/moderationAccess.js'
import DemoPanelLayout from './DemoPanelLayout.jsx'
import '../styles/admin-panel.css'

export default function AdminPanelLayout() {
  const { user } = useAuth()
  const { pathname, search, hash } = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: getAuthDestination(pathname + search + hash) }} />
  if (!canAdminister(user)) return (
    <main className="cook-main cook-view">
      <h1>Acceso denegado</h1>
      <p>El panel de administración requiere el rol ADMIN.</p>
      <div className="cook-actions"><Link className="site-button" to="/perfil">Volver a mi perfil</Link></div>
    </main>
  )

  return (
    <DemoPanelLayout
      className="admin-layout"
      title="Panel de administración"
      kicker="Administración"
      navLabel="Panel de administración"
      notice="La administración de usuarios consulta al servidor. Catálogos y recetas son demostraciones sin cambios reales."
    >
      <NavLink to="/admin/usuarios">Usuarios</NavLink>
      <NavLink to="/admin/catalogos">Catálogos (demo)</NavLink>
      <NavLink to="/admin/recetas">Recetas (demo)</NavLink>
      {canModerate(user) && <Link to="/moderador">Panel del moderador</Link>}
      <Link to="/perfil">Mi perfil</Link>
      <Link className="site-button" to="/">Sitio público</Link>
    </DemoPanelLayout>
  )
}
