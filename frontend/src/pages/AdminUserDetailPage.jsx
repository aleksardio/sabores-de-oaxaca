import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { AdminAccountBadge, AdminRoleBadges } from '../components/AdminUserBadges.jsx'
import {
  adminRegistrationUtc, adminUsersErrorMessage, cookRoleAction, createAdminUsersService, roleRefreshMessages,
} from '../services/adminUsersService.js'
import { adminUserId } from '../utils/adminAccess.js'

const dateFormat = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'UTC' })

function AdminUserDetail({ id }) {
  const { user, requestAuthenticated, requireFreshSignIn } = useAuth()
  const [result, setResult] = useState({})
  const [attempt, setAttempt] = useState(0)
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const readScope = useRef(null)
  const writing = useRef(false)
  const { account, error, kind, writeError, conflictMessage } = result
  const label = cookRoleAction(account)
  const date = account && adminRegistrationUtc(account.creadoEn)

  useEffect(() => {
    if (id === null) return
    const controller = new AbortController()
    const { signal } = controller
    readScope.current = signal
    createAdminUsersService(requestAuthenticated, user).detail(id, signal).then(
      (account) => { if (!signal.aborted) setResult((previous) => ({ kind: previous.kind, account })) },
      (error) => {
        if (!signal.aborted && error.name !== 'AbortError') setResult((previous) => ({ kind: previous.kind, error }))
      },
    )
    return () => controller.abort()
  }, [id, user, requestAuthenticated, attempt])

  function retry() {
    setResult({ kind })
    setAttempt((value) => value + 1)
  }

  async function saveRole() {
    const signal = readScope.current
    if (!signal || signal.aborted || writing.current || !confirmation) return
    writing.current = true
    setSaving(true)
    const action = confirmation
    setConfirmation('')
    setResult({ account })
    try {
      const service = createAdminUsersService(requestAuthenticated, user, requireFreshSignIn)
      const next = await (action === 'CUENTA' ? service.changeAccountState(account, { confirmed: true })
        : action === 'MODERADOR' ? service.changeModeratorRole(account, { confirmed: true })
          : service.changeCookRole(account, { confirmed: true }))
      if (!signal.aborted) setResult(next)
    } catch (error) {
      if (!signal.aborted && error.name !== 'AbortError' && error.status !== 401) {
        setResult({ writeError: error, ...(error.status === 400 && { account }) })
      }
    } finally {
      writing.current = false
      if (!signal.aborted) setSaving(false)
    }
  }

  return (
    <section className="cook-view" aria-labelledby="admin-user-title">
      <header>
        <Link className="cook-back" to="/admin/usuarios">← Volver a usuarios</Link>
        <p className="admin-eyebrow">Detalle de cuenta</p>
        <h1 id="admin-user-title">{account?.nombreVisible ?? (id === null || (error ?? writeError)?.status === 404 ? 'Usuario no encontrado' : 'Detalle de usuario')}</h1>
      </header>
      {id === null && <p role="alert">El ID de usuario no es válido.</p>}
      {id !== null && !account && !error && !writeError && <p role="status">Cargando usuario…</p>}
      {saving && <p role="status">Enviando el cambio y consultando el estado de la cuenta…</p>}
      {kind && (
        <p role="status">{conflictMessage || roleRefreshMessages[kind]} {error ? 'La actualización visual está pendiente.'
          : account ? 'Se consultó el estado actual de la cuenta.' : 'Consultando el estado de la cuenta…'}</p>
      )}
      {(error || writeError) && (
        <div className="cook-panel">
          <p role="alert">{adminUsersErrorMessage(error ?? writeError)}</p>
          {!account && <button className="site-button" type="button" onClick={retry}>{kind ? 'Consultar estado actual' : 'Reintentar consulta'}</button>}
        </div>
      )}
      {account && (
        <>
          <section className="cook-panel" aria-labelledby="admin-user-facts">
            <h2 id="admin-user-facts">Datos de la cuenta</h2>
            <dl className="admin-facts admin-facts--grid">
              <div><dt>ID</dt><dd>{account.id}</dd></div>
              <div><dt>Nombre visible</dt><dd>{account.nombreVisible}</dd></div>
              <div><dt>Correo</dt><dd>{account.correo}</dd></div>
              <div><dt>Estado de cuenta</dt><dd><AdminAccountBadge active={account.activo} /></dd></div>
              <div><dt>Fecha de registro (UTC)</dt><dd><time dateTime={date}>{dateFormat.format(new Date(date))} UTC</time></dd></div>
              <div><dt>Roles actuales</dt><dd><AdminRoleBadges roles={account.roles} /></dd></div>
            </dl>
          </section>
          <section className="cook-panel admin-form" aria-labelledby="admin-cook-role">
            <h2 id="admin-cook-role">Administración de roles</h2>
            <p>Retirar COCINERO no elimina recetas ni modifica otros roles.</p>
            {account.id === user.id && <p>Si cambias tu propio rol, tendrás que iniciar sesión de nuevo para consultar tus permisos actuales.</p>}
            {!label ? <p>No se pueden cambiar los roles de una cuenta inactiva.</p> : confirmation && confirmation !== 'CUENTA' ? (
              <div className="admin-note">
                <p>¿Confirmas {confirmation === 'COCINERO' ? label : `${account.roles.includes('MODERADOR') ? 'Retirar' : 'Asignar'} rol MODERADOR`} para {account.nombreVisible}?</p>
                <div className="cook-actions">
                  <button className="site-button site-button--green" type="button" onClick={saveRole}>Confirmar cambio</button>
                  <button className="site-button" type="button" onClick={() => setConfirmation('')}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="cook-actions">
                <button className="site-button" type="button" disabled={saving || Boolean(confirmation)} onClick={() => setConfirmation('COCINERO')}>{label}</button>
                <button className="site-button" type="button" disabled={saving || Boolean(confirmation)} onClick={() => setConfirmation('MODERADOR')}>{account.roles.includes('MODERADOR') ? 'Retirar' : 'Asignar'} rol MODERADOR</button>
              </div>
            )}
          </section>
          <section className="cook-panel admin-form" aria-labelledby="admin-account-state">
            <h2 id="admin-account-state">Administración de cuenta</h2>
            <p>La desactivación conserva los datos y revoca las sesiones existentes.</p>
            {account.id === user.id && account.activo ? <p>No puedes desactivar tu propia cuenta.</p> : confirmation === 'CUENTA' ? <div className="admin-note">
              <p>¿Confirmas {account.activo ? 'desactivar' : 'reactivar'} la cuenta de {account.nombreVisible}?</p>
              <div className="cook-actions"><button className="site-button site-button--green" type="button" disabled={saving} onClick={saveRole}>Confirmar cambio</button><button className="site-button" type="button" disabled={saving} onClick={() => setConfirmation('')}>Cancelar</button></div>
            </div> : <button className="site-button" type="button" disabled={saving || Boolean(confirmation)} onClick={() => setConfirmation('CUENTA')}>{account.activo ? 'Desactivar cuenta' : 'Reactivar cuenta'}</button>}
          </section>
        </>
      )}
    </section>
  )
}

export default function AdminUserDetailPage() {
  const { id } = useParams()
  return <AdminUserDetail key={id} id={adminUserId(id)} />
}
