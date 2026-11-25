import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { AdminAccountBadge, AdminRoleBadges } from '../components/AdminUserBadges.jsx'
import { adminUsersErrorMessage, adminUsersTextLimit, createAdminUsersService } from '../services/adminUsersService.js'
import { adminUserRoles } from '../utils/adminAccess.js'

const initialFilters = { texto: '', rol: '', activo: '', pagina: 0 }

export default function AdminUsersPage() {
  const { user, requestAuthenticated } = useAuth()
  const [filters, setFilters] = useState(initialFilters)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const searchRef = useRef(null)
  const current = result?.filters === filters && result.attempt === attempt && result.user === user ? result : null
  const page = current?.page

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const service = createAdminUsersService(requestAuthenticated, user)
    const activo = filters.activo === '' ? undefined : filters.activo === 'true'
    service.list({ ...filters, activo }, signal).then(
      (page) => { if (!signal.aborted) setResult({ filters, attempt, user, page }) },
      (error) => {
        if (!signal.aborted && error.name !== 'AbortError') setResult({ filters, attempt, user, error })
      },
    )
    return () => controller.abort()
  }, [filters, attempt, user, requestAuthenticated])

  function changeFilter(field, value) {
    setFilters((previous) => ({ ...previous, [field]: value, pagina: 0 }))
  }

  function changePage(pagina) {
    setFilters((previous) => ({ ...previous, pagina }))
  }

  function clearFilters() {
    setFilters(initialFilters)
    searchRef.current.focus()
  }

  return (
    <section className="cook-view" aria-labelledby="admin-users-title">
      <header>
        <p className="admin-eyebrow">Cuentas y roles</p>
        <h1 id="admin-users-title">Administración de usuarios</h1>
        <p className="cook-muted">Consulta las cuentas registradas y gestiona el rol COCINERO.</p>
      </header>
      <section className="cook-panel" aria-labelledby="admin-users-list">
        <h2 id="admin-users-list">Cuentas registradas</h2>
        <div className="cook-filters">
          <label className="cook-field">
            Buscar por nombre visible o correo
            <input ref={searchRef} type="search" maxLength={adminUsersTextLimit} value={filters.texto}
              onChange={(event) => changeFilter('texto', event.target.value)} />
          </label>
          <label className="cook-field">
            Estado de cuenta
            <select value={filters.activo} onChange={(event) => changeFilter('activo', event.target.value)}>
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Desactivadas</option>
            </select>
          </label>
          <label className="cook-field">
            Rol asignado
            <select value={filters.rol} onChange={(event) => changeFilter('rol', event.target.value)}>
              <option value="">Todos los roles</option>
              {adminUserRoles.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        {(filters.texto || filters.rol || filters.activo) && <button className="site-button" type="button" onClick={clearFilters}>Limpiar filtros</button>}
        {!current && <p role="status">Cargando cuentas…</p>}
        {current?.error && (
          <>
            <p role="alert">{adminUsersErrorMessage(current.error)}</p>
            <button className="site-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button>
          </>
        )}
        {page && (
          <>
            <p className="cook-results cook-muted" role="status">
              {!page.totalElementos ? 'No hay cuentas que coincidan con estos filtros.'
                : !page.contenido.length ? 'Esta página ya no contiene cuentas.'
                  : `${page.totalElementos} ${page.totalElementos === 1 ? 'cuenta encontrada' : 'cuentas encontradas'}. Página ${page.pagina + 1} de ${page.totalPaginas}.`}
            </p>
            {page.contenido.length > 0 && (
              <table className="cook-table admin-table" role="table" aria-labelledby="admin-users-list">
                <thead role="rowgroup"><tr role="row">
                  <th scope="col">Nombre visible / correo</th><th scope="col">Estado</th><th scope="col">Roles</th><th scope="col">Acción</th>
                </tr></thead>
                <tbody role="rowgroup">
                  {page.contenido.map((account) => (
                    <tr key={account.id} role="row">
                      <th scope="row" role="rowheader">{account.nombreVisible}<small>{account.correo}</small></th>
                      <td role="cell"><span className="admin-mobile-label" aria-hidden="true">Estado</span><AdminAccountBadge active={account.activo} /></td>
                      <td role="cell"><span className="admin-mobile-label" aria-hidden="true">Roles</span><AdminRoleBadges roles={account.roles} /></td>
                      <td role="cell"><Link className="site-button" to={String(account.id)} aria-label={`Ver detalle de ${account.nombreVisible}`}>Ver detalle <span aria-hidden="true">→</span></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {(page.totalPaginas > 1 || page.pagina > 0) && (
              <nav className="cook-pagination" aria-label="Paginación de usuarios">
                <button className="site-button" type="button" disabled={page.pagina === 0}
                  onClick={() => changePage(Math.min(page.pagina - 1, Math.max(0, page.totalPaginas - 1)))}>Anterior</button>
                <button className="site-button" type="button" disabled={page.pagina + 1 >= page.totalPaginas}
                  onClick={() => changePage(page.pagina + 1)}>Siguiente</button>
              </nav>
            )}
          </>
        )}
      </section>
    </section>
  )
}
