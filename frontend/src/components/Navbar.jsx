import { Link, NavLink } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import LogoutButton from './LogoutButton.jsx'

export default function Navbar() {
  const { user, logoutPending, logoutError, notice, leaveLocally } = useAuth()

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
          {user ? (
            <>
              <span className="header-user-name" title={user.nombreVisible}>{user.nombreVisible}</span>
              <NavLink className="site-button" to="/perfil">Mi perfil</NavLink>
              <LogoutButton />
            </>
          ) : <NavLink className="site-button" to="/login">Iniciar sesión</NavLink>}
          <button className="site-button site-button--clay" type="button" disabled title="Publicar recetas aún no está disponible">
            Compartir receta
          </button>
        </div>
      </div>
      <div className="container">
        <p className="session-message" role="status">{logoutPending ? 'Cerrando sesión…' : notice}</p>
        <p className="session-message session-message--error" role="alert">{logoutError}</p>
        {logoutError && (
          <button className="site-button session-local-action" type="button" onClick={leaveLocally}>
            Salir solo de este navegador
          </button>
        )}
      </div>
    </header>
  )
}
