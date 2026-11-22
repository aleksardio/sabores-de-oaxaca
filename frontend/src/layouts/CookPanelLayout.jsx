import { Link, NavLink } from 'react-router'
import DemoPanelLayout from './DemoPanelLayout.jsx'

export default function CookPanelLayout() {
  return (
    <DemoPanelLayout
      title="Panel del cocinero"
      kicker="Mi cocina · Demostración"
      navLabel="Panel de demostración"
      notice="Vista de demostración. La gestión real de recetas estará disponible al conectar la cuenta y el servidor."
    >
      <NavLink to="/cocinero/recetas" end>Mis recetas</NavLink>
      <NavLink to="/cocinero/recetas/nueva">Crear receta</NavLink>
      <Link className="site-button" to="/">Ir al sitio público</Link>
    </DemoPanelLayout>
  )
}
