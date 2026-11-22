import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { AdminAccountBadge, AdminRoleBadges } from '../components/AdminUserBadges.jsx'
import { demoAdminUsers } from '../data/demoAdminUsers.js'
import { adminRoles, filterAdminUsers } from '../utils/adminRules.js'

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [role, setRole] = useState('')
  const searchRef = useRef(null)
  const users = filterAdminUsers(demoAdminUsers, { search, status, role })
  const active = demoAdminUsers.filter((user) => user.active).length

  function clearFilters() {
    setSearch('')
    setStatus('')
    setRole('')
    searchRef.current.focus()
  }

  return (
    <section className="cook-view" aria-labelledby="admin-users-title">
      <header>
        <p className="admin-eyebrow">Cuentas y roles</p>
        <h1 id="admin-users-title">Administración de usuarios</h1>
        <p className="cook-muted">Consulta cuentas ficticias, sus roles asignados y prepara acciones sin modificar los ejemplos.</p>
      </header>
      <ul className="cook-state-summary" role="list" aria-label="Resumen de cuentas">
        <li data-state="ACTIVA">Cuentas activas <strong>{active}</strong></li>
        <li data-state="BAJA">Cuentas desactivadas <strong>{demoAdminUsers.length - active}</strong></li>
      </ul>
      <section className="cook-panel" aria-labelledby="admin-users-list">
        <h2 id="admin-users-list">Cuentas de ejemplo</h2>
        <div className="cook-filters">
          <label className="cook-field">
            Buscar por nombre visible
            <input ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <label className="cook-field">
            Estado de cuenta
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Desactivadas</option>
            </select>
          </label>
          <label className="cook-field">
            Rol asignado
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">Todos los roles</option>
              {adminRoles.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <p className="cook-results cook-muted" role="status">
          {users.length ? `${users.length} de ${demoAdminUsers.length} cuentas` : 'No hay cuentas que coincidan con estos filtros.'}
        </p>
        {users.length ? (
          <table className="cook-table admin-table" role="table" aria-labelledby="admin-users-list">
            <thead role="rowgroup"><tr role="row">
              <th scope="col">Nombre visible</th><th scope="col">Estado</th><th scope="col">Roles</th><th scope="col">Acción</th>
            </tr></thead>
            <tbody role="rowgroup">
              {users.map((user) => (
                <tr key={user.id} role="row">
                  <th scope="row" role="rowheader">{user.name}<small>{user.id}</small></th>
                  <td role="cell"><span className="admin-mobile-label" aria-hidden="true">Estado</span><AdminAccountBadge active={user.active} /></td>
                  <td role="cell"><span className="admin-mobile-label" aria-hidden="true">Roles</span><AdminRoleBadges roles={user.roles} /></td>
                  <td role="cell"><Link className="site-button" to={user.id} aria-label={`Ver detalle de ${user.name}`}>Ver detalle <span aria-hidden="true">→</span></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <button className="site-button" type="button" onClick={clearFilters}>Limpiar filtros</button>}
      </section>
    </section>
  )
}
