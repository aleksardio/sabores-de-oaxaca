import { NavLink } from 'react-router'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <p><span aria-hidden="true">✦ </span>Sabores de Oaxaca · Cultura que vive en cada mesa</p>
        <nav className="footer-nav" aria-label="Comunidad y cuenta">
          <NavLink to="/autores">Autores</NavLink>
          <NavLink to="/perfil">Mi perfil</NavLink>
          <NavLink to="/favoritos">Favoritos</NavLink>
        </nav>
        <p>Comunidad · Oaxaca · 2026</p>
      </div>
    </footer>
  )
}
