import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { cookRequestError, createCookRequestsService } from '../services/cookRequestsService.js'

export default function CookRoleRequest() {
  const { user, requestAuthenticated } = useAuth()
  const [result, setResult] = useState(null)
  const [reload, setReload] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const active = user && !user.roles.includes('COCINERO')
  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    createCookRequestsService(requestAuthenticated, user).own(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ user, reload, data }) },
      (error) => { if (!controller.signal.aborted) setResult({ user, reload, error }) },
    )
    return () => controller.abort()
  }, [active, user, requestAuthenticated, reload])
  if (!active) return null
  const current = result?.user === user && result.reload === reload ? result : null
  async function send() {
    if (lock.current) return
    lock.current = true; setBusy(true)
    try {
      const data = await createCookRequestsService(requestAuthenticated, user).send()
      setResult({ user, reload, data })
    } catch (error) {
      setResult({ user, reload, error })
    } finally { setBusy(false); setConfirming(false); lock.current = false }
  }
  return <section className="community-panel"><h2>Rol cocinero</h2>
    {!current && <p role="status">Consultando solicitud…</p>}
    {current?.error && <><p role="alert">{cookRequestError(current.error)}</p><button className="site-button" onClick={() => setReload((n) => n + 1)}>Actualizar estado</button></>}
    {current && !current.error && <>
      {current.data?.estado === 'PENDIENTE' && <p>Solicitud pendiente</p>}
      {current.data?.estado === 'RECHAZADA' && <p>Tu solicitud fue rechazada. Puedes enviar una nueva.</p>}
      {current.data?.estado === 'APROBADA' && <p>La solicitud anterior fue aprobada. Vuelve a iniciar sesión para actualizar tus permisos; si ya no tienes el rol, puedes enviar otra solicitud.</p>}
      {current.data?.estado !== 'PENDIENTE' && (confirming
        ? <><p>¿Deseas enviar una solicitud para ser cocinero?</p><button className="site-button" disabled={busy} onClick={send}>Confirmar solicitud</button> <button className="site-button" disabled={busy} onClick={() => setConfirming(false)}>Cancelar</button></>
        : <button className="site-button" onClick={() => setConfirming(true)}>Solicitar ser cocinero</button>)}
    </>}
  </section>
}
