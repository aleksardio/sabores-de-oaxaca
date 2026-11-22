import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import '../styles/cook-panel.css'

export default function DemoPanelLayout({ className = '', title, kicker, navLabel, notice, children }) {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={`cook-layout${className ? ` ${className}` : ''}`}>
      <aside className="cook-sidebar">
        <Link className="cook-brand" to="/"><span aria-hidden="true">✦ </span>Sabores de Oaxaca</Link>
        <p className="cook-kicker">{kicker}</p>
        <nav aria-label={navLabel}>{children}</nav>
      </aside>
      <div className="cook-content">
        <header className="cook-topbar">
          <Link to="/">Sabores de Oaxaca</Link>
          <span aria-hidden="true">/</span>
          <span>{title}</span>
        </header>
        <main className="cook-main">
          <p className="cook-demo-notice">{notice}</p>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
