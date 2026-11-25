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
  const [confirmation, setConfirmation] = useState(false)
  const [saving, setSaving] = useState(false)
  const readScope = useRef(null)
  const writing = useRef(false)
  const { account, error, kind, writeError } = result
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
    if (!signal || signal.aborted || writing.current || !confirmation || !label) return
    writing.current = true
    setSaving(true)
    setConfirmation(false)
    setResult({ account })
    try {
      const next = await createAdminUsersService(requestAuthenticated, user, requireFreshSignIn)
        .changeCookRole(account, { confirmed: true })
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
        <p role="status">{roleRefreshMessages[kind]} {error ? 'La actualización visual está pendiente.'
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
            <h2 id="admin-cook-role">Rol COCINERO</h2>
            <p>Retirar COCINERO no elimina recetas ni modifica otros roles.</p>
            {account.id === user.id && <p>Si cambias tu propio rol, tendrás que iniciar sesión de nuevo para consultar tus permisos actuales.</p>}
            {!label ? <p>No se pueden cambiar los roles de una cuenta inactiva.</p> : confirmation ? (
              <div className="admin-note">
                <p>¿Confirmas el cambio «{label}» para {account.nombreVisible} ({account.correo})?</p>
                <div className="cook-actions">
                  <button className="site-button site-button--green" type="button" onClick={saveRole}>Confirmar cambio</button>
                  <button className="site-button" type="button" onClick={() => setConfirmation(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="cook-actions">
                <button className="site-button" type="button" disabled={saving} onClick={() => setConfirmation(true)}>{label}</button>
              </div>
            )}
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
