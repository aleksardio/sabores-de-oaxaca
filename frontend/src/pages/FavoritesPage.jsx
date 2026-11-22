import { Link } from 'react-router'
import '../styles/community.css'

export default function FavoritesPage() {
  return (
    <section className="community-page" aria-labelledby="favorites-title">
      <div className="community-panel community-panel--hero community-panel--favorites">
        <div>
          <p className="community-eyebrow">Tu recetario personal</p>
          <h1 id="favorites-title">Mis recetas favoritas</h1>
          <p>Necesitas iniciar sesión para consultar tus favoritos personales. Por ahora puedes explorar el catálogo público sin una cuenta.</p>
          <div className="community-actions">
            <Link className="site-button site-button--green" to="/login">Iniciar sesión</Link>
            <Link className="site-button" to="/recetas">Explorar el catálogo</Link>
          </div>
        </div>
        <div className="community-favorites-art" aria-hidden="true">♡</div>
      </div>
    </section>
  )
}
