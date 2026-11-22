import { Link } from 'react-router'
import { demoProfile } from '../data/demoProfile.js'
import '../styles/community.css'

export default function ProfilePage() {
  return (
    <section className="community-page" aria-labelledby="profile-title">
      <header className="community-panel community-panel--hero">
        <p className="community-eyebrow">Tu cuenta</p>
        <h1 id="profile-title">Mi perfil</h1>
        <p>Necesitas iniciar sesión para consultar y administrar tu perfil.</p>
        <div className="community-actions">
          <Link className="site-button site-button--green" to="/login">Iniciar sesión</Link>
          <Link className="site-button" to="/registro">Crear una cuenta</Link>
        </div>
      </header>

      <section className="community-panel" aria-labelledby="profile-preview-title">
        <p className="community-eyebrow">Ejemplo ficticio</p>
        <h2 id="profile-preview-title">Vista previa de diseño</h2>
        <p>Así se verá un perfil. La edición aún no está disponible.</p>
        <div className="community-preview">
          <div>
            <span className="community-avatar" aria-hidden="true">{demoProfile.initials}</span>
            <p>Avatar opcional</p>
          </div>
          <dl className="community-preview__fields">
            <div>
              <dt>Nombre visible <small>Hasta 100 caracteres</small></dt>
              <dd>{demoProfile.nombre_visible}</dd>
            </div>
            <div>
              <dt>Biografía <small>Opcional · Hasta 1000 caracteres</small></dt>
              <dd>{demoProfile.biografia}</dd>
            </div>
          </dl>
        </div>
      </section>
    </section>
  )
}
