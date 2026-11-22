import { Link, NavLink } from 'react-router'
import DemoPanelLayout from './DemoPanelLayout.jsx'
import '../styles/moderation.css'

export default function ModeratorPanelLayout() {
  return (
    <DemoPanelLayout
      className="mod-layout"
      title="Panel de moderación"
      kicker="Moderación · Demostración"
      navLabel="Panel de moderación"
      notice="Panel de moderación de demostración. Las decisiones reales estarán disponibles cuando se conecten la autenticación y el servidor."
    >
      <NavLink to="/moderador/recetas">Recetas</NavLink>
      <NavLink to="/moderador/reportes">Reportes</NavLink>
      <Link className="site-button" to="/">Sitio público</Link>
    </DemoPanelLayout>
  )
}
