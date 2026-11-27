import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { cookRequestError, createCookRequestsService } from '../services/cookRequestsService.js'

export default function AdminCookRequestsPage() {
  const { user, requestAuthenticated } = useAuth()
  const [page, setPage] = useState(0)
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    createCookRequestsService(requestAuthenticated, user).pending(page, controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ page, reload, user, data }) },
      (error) => { if (!controller.signal.aborted) setResult({ page, reload, user, error }) },
    )
    return () => controller.abort()
  }, [user, requestAuthenticated, page, reload])
  const current = result?.page === page && result.reload === reload && result.user === user ? result : null
  async function decide() {
    if (lock.current || !selected) return
    lock.current = true; setBusy(true)
    try {
      await createCookRequestsService(requestAuthenticated, user).decide(selected.row.id, selected.action)
      setMessage('Decisión confirmada por el servidor.')
    } catch (error) { setMessage(cookRequestError(error)) }
    finally { setSelected(null); setReload((n) => n + 1); setBusy(false); lock.current = false }
  }
  return <section className="cook-view"><header><h1>Solicitudes de cocinero</h1><p className="cook-muted">Revisa las solicitudes pendientes.</p></header>
    <section className="cook-panel">
      {message && <p role="status">{message}</p>}
      {!current && <p role="status">Cargando solicitudes…</p>}
      {current?.error && <><p role="alert">{cookRequestError(current.error)}</p><button className="site-button" onClick={() => setReload((n) => n + 1)}>Reintentar</button></>}
      {current?.data && <>{current.data.length === 0 ? <p>No hay solicitudes pendientes en esta página.</p> : <table className="cook-table admin-table"><thead><tr><th>Usuario</th><th>Solicitud</th><th>Acciones</th></tr></thead><tbody>{current.data.map((row) => <tr key={row.id}><td>{row.nombre} (ID {row.usuarioId})</td><td>{row.id}</td><td><button className="site-button" disabled={busy} onClick={() => setSelected({ row, action: 'aprobar' })}>Aprobar</button> <button className="site-button" disabled={busy} onClick={() => setSelected({ row, action: 'rechazar' })}>Rechazar</button></td></tr>)}</tbody></table>}
        <div className="cook-actions"><button className="site-button" disabled={page === 0 || busy} onClick={() => { setSelected(null); setPage(page - 1) }}>Anterior</button><button className="site-button" disabled={current.data.length < 20 || busy} onClick={() => { setSelected(null); setPage(page + 1) }}>Siguiente</button></div></>}
      {selected && <div><p>¿Confirmas {selected.action} la solicitud de {selected.row.nombre}?</p><button className="site-button cook-primary" disabled={busy} onClick={decide}>Confirmar</button> <button className="site-button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button></div>}
    </section></section>
}
