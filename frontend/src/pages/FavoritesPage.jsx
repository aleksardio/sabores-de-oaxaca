import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import '../styles/community.css'

export default function FavoritesPage() {
  const { user } = useAuth()

  return (
    <section className="community-page" aria-labelledby="favorites-title">
      <div className="community-panel community-panel--hero community-panel--favorites">
        <div>
          <p className="community-eyebrow">Tu recetario personal</p>
          <h1 id="favorites-title">Mis recetas favoritas</h1>
          <p>Los favoritos personales aún no están disponibles. Mientras tanto, puedes explorar el catálogo público.</p>
          <div className="community-actions">
            {!user && <Link className="site-button site-button--green" to="/login" state={{ from: '/favoritos' }}>Iniciar sesión</Link>}
            <Link className="site-button" to="/recetas">Explorar el catálogo</Link>
          </div>
        </div>
        <div className="community-favorites-art" aria-hidden="true">♡</div>
      </div>
    </section>
  )
}
