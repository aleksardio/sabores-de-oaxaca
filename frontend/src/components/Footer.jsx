import { Link, NavLink } from 'react-router'
import BrandLogo from './BrandLogo.jsx'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <div className="footer-brand">
          <Link className="footer-brand__link" to="/" aria-label="Sabores de Oaxaca, inicio">
            <BrandLogo decorative />
          </Link>
          <p>Cultura que vive en cada mesa</p>
        </div>
        <nav className="footer-nav" aria-label="Comunidad y cuenta">
          <NavLink to="/perfil">Mi perfil</NavLink>
          <NavLink to="/favoritos">Favoritos</NavLink>
          <NavLink to="/cocinero/recetas">Mis recetas</NavLink>
        </nav>
        <p>Comunidad · Oaxaca · 2026</p>
      </div>
    </footer>
  )
}
