import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../services/apiClient.js'

let scriptPromise

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => {
        if (window.google?.accounts?.id) resolve(window.google)
        else reject(new Error('Google Identity Services no disponible'))
      }
      script.onerror = () => reject(new Error('No se pudo cargar Google'))
      document.head.appendChild(script)
    }).catch((error) => {
      scriptPromise = undefined
      throw error
    })
  }

  return scriptPromise
}

export default function GoogleLoginButton({ onSignIn }) {
  const container = useRef(null)
  const activeRequest = useRef(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

  useEffect(() => {
    if (!clientId) return undefined

    let cancelled = false

    loadGoogleIdentity().then((google) => {
      if (cancelled || !container.current) return

      google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: async ({ credential }) => {
          if (cancelled || activeRequest.current) return

          if (!credential) {
            setError('Google no devolvió una credencial válida.')
            return
          }

          const controller = new AbortController()
          activeRequest.current = controller
          setPending(true)
          setError('')

          try {
            await onSignIn(credential, controller.signal)
          } catch (failure) {
            if (!cancelled && !controller.signal.aborted) {
              setError(failure instanceof ApiError
                ? failure.message
                : 'No se pudo iniciar sesión con Google.')
            }
          } finally {
            if (!cancelled) {
              activeRequest.current = null
              setPending(false)
            }
          }
        },
      })

      google.accounts.id.renderButton(container.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        locale: 'es',
        width: 260,
      })
    }).catch(() => {
      if (!cancelled) {
        setError('No se pudo cargar el acceso con Google.')
      }
    })

    return () => {
      cancelled = true
      activeRequest.current?.abort()
      activeRequest.current = null
    }
  }, [clientId, onSignIn])

  if (!clientId) return null

  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
      <p>O continúa con tu cuenta de Google</p>
      <div ref={container} />
      {pending && <p role="status">Verificando tu cuenta de Google…</p>}
      {error && <p role="alert" className="auth-status--error">{error}</p>}
    </div>
  )
}
