import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import LogoutButton from '../components/LogoutButton.jsx'
import CookRoleRequest from '../components/CookRoleRequest.jsx'
import { canAdminister } from '../utils/adminAccess.js'
import { canModerate } from '../utils/moderationAccess.js'
import '../styles/community.css'

const roleLabels = {
  USUARIO: 'Usuario',
  COCINERO: 'Cocinero',
  MODERADOR: 'Moderador',
  ADMIN: 'Administrador',
}

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <section className="community-page" aria-labelledby="profile-title">
      <header className="community-panel community-panel--hero">
        <p className="community-eyebrow">Tu cuenta</p>
        <h1 id="profile-title">Mi perfil</h1>
        {user ? (
          <p>Consulta los datos de tu cuenta. La edición del perfil todavía no está disponible.</p>
        ) : (
          <>
            <p>Necesitas iniciar sesión para consultar tu perfil.</p>
            <div className="community-actions">
              <Link className="site-button site-button--green" to="/login" state={{ from: '/perfil' }}>Iniciar sesión</Link>
              <Link className="site-button" to="/registro">Crear una cuenta</Link>
            </div>
          </>
        )}
      </header>

      {user && (
        <section className="community-panel" aria-labelledby="profile-data-title">
          <h2 id="profile-data-title">Datos de la cuenta</h2>
          <dl className="community-profile-fields">
            <div>
              <dt>Nombre visible</dt>
              <dd>{user.nombreVisible}</dd>
            </div>
            <div>
              <dt>Correo electrónico</dt>
              <dd>{user.correo}</dd>
            </div>
            <div>
              <dt>Roles</dt>
              <dd>{user.roles.length ? (
                <ul>
                  {user.roles.map((role) => <li key={role}>{Object.hasOwn(roleLabels, role) ? `${roleLabels[role]} (${role})` : role}</li>)}
                </ul>
              ) : 'Sin roles asignados.'}</dd>
            </div>
          </dl>
          <p>Cerrar sesión revoca las sesiones de tu cuenta en todos los dispositivos.</p>
          <div className="community-actions">
            <Link className="site-button site-button--green" to="/cocinero/recetas">Mis recetas</Link>
            {canModerate(user) && <Link className="site-button" to="/moderador/recetas">Panel de moderación</Link>}
            {canAdminister(user) && <Link className="site-button" to="/admin/usuarios">Panel de administración</Link>}
            <LogoutButton />
          </div>
        </section>
      )}
      {user && <CookRoleRequest />}
    </section>
  )
}
