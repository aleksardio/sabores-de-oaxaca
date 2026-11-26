import { useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import BrandLogo from '../components/BrandLogo.jsx'
import '../styles/auth.css'

export default function AuthLayout() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  const mainRef = useRef(null)

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname
      mainRef.current.querySelector('h1')?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return (
    <div className="auth-layout">
      <div className="auth-brand-panel">
        <div className="auth-brand"><BrandLogo /></div>
        <p className="auth-brand-tag">Cocina · Memoria · Comunidad</p>
        <p className="auth-brand-title">Cuida el recetario de Oaxaca.</p>
        <p className="auth-brand-description">
          Conecta con los sabores que nos identifican y comparte lo mejor de nuestra gastronomía.
        </p>
        <div className="auth-illustration" aria-hidden="true">
          Sabores que nos unen
        </div>
      </div>
      <main className="auth-main" ref={mainRef}>
        <Link className="site-button auth-back" to="/"><span aria-hidden="true">←</span> Volver al inicio</Link>
        <Outlet />
      </main>
    </div>
  )
}
