import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import '../styles/cook-panel.css'

export default function CookPanelLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="cook-layout">
      <aside className="cook-sidebar">
        <Link className="cook-brand" to="/"><span aria-hidden="true">✦ </span>Sabores de Oaxaca</Link>
        <p className="cook-kicker">Mi cocina · Demostración</p>
        <nav aria-label="Panel de demostración">
          <NavLink to="/cocinero/recetas" end>Mis recetas</NavLink>
          <NavLink to="/cocinero/recetas/nueva">Crear receta</NavLink>
          <Link className="site-button" to="/">Ir al sitio público</Link>
        </nav>
      </aside>
      <div className="cook-content">
        <header className="cook-topbar">
          <Link to="/">Sabores de Oaxaca</Link>
          <span aria-hidden="true">/</span>
          <span>Panel del cocinero</span>
        </header>
        <main className="cook-main">
          <p className="cook-demo-notice">
            Vista de demostración. La gestión real de recetas estará disponible al conectar la cuenta y el servidor.
          </p>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
