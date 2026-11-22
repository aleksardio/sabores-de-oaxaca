import { Link, NavLink } from 'react-router'

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="container header-content">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">✦</span>
          <span>Sabores de Oaxaca</span>
        </Link>
        <nav className="site-nav" aria-label="Navegación principal">
          <NavLink className="site-button" to="/" end>Inicio</NavLink>
          <NavLink className="site-button" to="/recetas">Explorar</NavLink>
          <NavLink className="site-button" to="/tradiciones">Tradiciones</NavLink>
        </nav>
        <div className="header-actions">
          <NavLink className="site-button" to="/login">Iniciar sesión</NavLink>
          <button className="site-button site-button--clay" type="button" disabled title="Publicar recetas aún no está disponible">
            Compartir receta
          </button>
        </div>
      </div>
    </header>
  )
}
