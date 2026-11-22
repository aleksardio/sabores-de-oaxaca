import { Link, NavLink } from 'react-router'
import DemoPanelLayout from './DemoPanelLayout.jsx'
import '../styles/admin-panel.css'

export default function AdminPanelLayout() {
  return (
    <DemoPanelLayout
      className="admin-layout"
      title="Panel de administración"
      kicker="Administración · Demostración"
      navLabel="Panel de administración"
      notice="Panel administrativo de demostración. Las operaciones reales requerirán una cuenta activa con rol ADMIN y autorización del servidor."
    >
      <NavLink to="/admin/usuarios">Usuarios</NavLink>
      <NavLink to="/admin/catalogos">Catálogos</NavLink>
      <NavLink to="/admin/recetas">Recetas</NavLink>
      <Link to="/moderador">Panel del moderador</Link>
      <Link className="site-button" to="/">Sitio público</Link>
    </DemoPanelLayout>
  )
}
