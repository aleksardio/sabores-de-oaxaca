import { Link, NavLink } from 'react-router'

export default function Navbar() {
  return (
    <header className="site-header">
      <div className="container header-content">
        <Link className="brand" to="/">Sabores de Oaxaca</Link>
        <nav className="site-nav" aria-label="Navegación principal">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/recetas">Recetas</NavLink>
          <NavLink to="/login">Iniciar sesión</NavLink>
          <NavLink to="/registro">Registro</NavLink>
        </nav>
      </div>
    </header>
  )
}
