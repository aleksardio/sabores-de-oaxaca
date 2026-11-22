import { Link, useParams } from 'react-router'
import AdminActionPreview from '../components/AdminActionPreview.jsx'
import { AdminAccountBadge, AdminRoleBadges } from '../components/AdminUserBadges.jsx'
import { demoAdminUsers } from '../data/demoAdminUsers.js'
import { findAdminRecord } from '../utils/adminRules.js'

const dateFormat = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' })

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const user = findAdminRecord(demoAdminUsers, id)

  return (
    <section className="cook-view" aria-labelledby="admin-user-title">
      <header>
        <Link className="cook-back" to="/admin/usuarios">← Volver a usuarios</Link>
        <p className="admin-eyebrow">Detalle de cuenta</p>
        <h1 id="admin-user-title">{user?.name ?? 'Usuario no encontrado'}</h1>
        {!user && <p className="cook-muted">El identificador no corresponde a una cuenta de demostración.</p>}
      </header>
      {user && (
        <>
          <section className="cook-panel" aria-labelledby="admin-user-facts">
            <h2 id="admin-user-facts">Datos de ejemplo</h2>
            <dl className="admin-facts admin-facts--grid">
              <div><dt>ID de ejemplo</dt><dd>{user.id}</dd></div>
              <div><dt>Estado de cuenta</dt><dd><AdminAccountBadge active={user.active} /></dd></div>
              <div><dt>Fecha de registro ficticia</dt><dd><time dateTime={user.registeredOn}>{dateFormat.format(new Date(user.registeredOn))}</time></dd></div>
              {user.recipeCount !== undefined && <div><dt>Recetas de ejemplo</dt><dd>{user.recipeCount}</dd></div>}
              <div><dt>Roles actuales</dt><dd><AdminRoleBadges roles={user.roles} /></dd></div>
            </dl>
          </section>
          <AdminActionPreview key={user.id} kind="user" record={user} />
          <section className="cook-panel admin-guidance" aria-labelledby="admin-role-guidance">
            <h2 id="admin-role-guidance">Reglas de cuentas y roles</h2>
            <p>Las cuentas nuevas reciben <strong>USUARIO</strong>. Los roles son acumulables: <strong>ADMIN</strong> permite asignar y retirar roles y también moderar, sin que la cuenta tenga que tener <strong>MODERADOR</strong> asignado.</p>
            <p className="cook-muted">Pendiente de acordar con Aleks: la gestión de los cambios sobre los propios roles y sobre la última cuenta ADMIN.</p>
          </section>
        </>
      )}
    </section>
  )
}
