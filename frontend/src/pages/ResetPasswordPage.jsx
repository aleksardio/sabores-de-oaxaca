import { useId, useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import AuthForm from '../components/AuthForm.jsx'
import { InvalidRecoveryLink, resetPassword } from '../services/passwordRecoveryService.js'
import { getAuthDestination } from '../utils/authDestination.js'
import { validateNewPassword } from '../utils/authValidation.js'

const fields = ['password', 'confirmation']
const sessionNotice = 'Por seguridad, se cerró la sesión anterior solo en este navegador. Vuelve a iniciar sesión.'

export default function ResetPasswordPage({ readResetFlow }) {
  const { key, state } = useLocation()
  return <ResetEntry key={key} flow={readResetFlow?.(key)} loginState={{ from: getAuthDestination(state?.from) }} />
}

function ResetEntry({ flow, loginState }) {
  const [discarded, setDiscarded] = useState(false)

  useLayoutEffect(() => {
    function invalidateSnapshot(event) {
      if (!event.persisted) return
      // Antes de congelar el documento, desmonta el formulario y cualquier resultado anterior.
      // pageshow vuelve a aplicar la misma regla antes de mostrar una página restaurada.
      flushSync(() => setDiscarded(true))
    }
    window.addEventListener('pagehide', invalidateSnapshot)
    window.addEventListener('pageshow', invalidateSnapshot)
    return () => {
      window.removeEventListener('pagehide', invalidateSnapshot)
      window.removeEventListener('pageshow', invalidateSnapshot)
    }
  }, [])

  return <ResetForm key={discarded ? 'discarded' : 'active'} flow={discarded ? null : flow} loginState={loginState} />
}

function ResetForm({ flow, loginState }) {
  const [result, setResult] = useState('')
  const requirementsId = useId()
  const { user, requireFreshSignIn } = useAuth()

  async function submit(values, formSignal) {
    const token = flow?.readToken()
    if (!token) {
      setResult('missing')
      throw new InvalidRecoveryLink()
    }
    const signal = AbortSignal.any([formSignal, flow.signal])
    try {
      await resetPassword(token, values, signal)
      signal.throwIfAborted()
    } catch (error) {
      signal.throwIfAborted()
      if (error instanceof InvalidRecoveryLink) {
        flow.forgetToken()
        setResult('invalid')
      }
      throw error
    }
    return user
  }

  function complete(userAtSubmit) {
    if (!flow.readToken()) return
    flow.forgetToken()
    setResult('success')
    // Solo la sesión que estaba activa al enviar, sin llamar a /logout ni inferir la cuenta.
    if (userAtSubmit) requireFreshSignIn(userAtSubmit, sessionNotice)
  }

  const login = <Link className="site-button" to="/login" state={loginState}>Iniciar sesión</Link>
  const request = <Link className="site-button" to="/recuperar-contrasena" state={loginState}>Solicitar un nuevo enlace</Link>

  if (result === 'success') {
    return (
      <section className="auth-page">
        <h1 tabIndex={-1} ref={(heading) => { heading?.focus() }}>Contraseña actualizada</h1>
        <p className="auth-description" role="status">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        {login}
      </section>
    )
  }

  if (result || !flow) {
    return (
      <section className="auth-page">
        <h1 tabIndex={-1} ref={(heading) => { heading?.focus() }}>Restablecer contraseña</h1>
        <p className="auth-description" role="alert">
          {result === 'invalid'
            ? 'El enlace no es válido, ya se usó o venció. Solicita uno nuevo.'
            : 'El enlace falta o no tiene el formato esperado. Si recargaste la página, vuelve a abrir el enlace original del correo o solicita uno nuevo.'}
        </p>
        <div className="auth-actions">{request}{login}</div>
      </section>
    )
  }

  return (
    <section className="auth-page">
      <h1 tabIndex={-1}>Restablecer contraseña</h1>
      <p className="auth-description" id={requirementsId}>
        Usa de 8 a 72 caracteres (máximo 72 bytes en UTF-8), con al menos una mayúscula de A a Z,
        un número de 0 a 9 y un carácter especial que no sea letra, número ni espacio, como !.
      </p>
      <AuthForm fields={fields} validate={validateNewPassword} onSubmit={submit}
        onSuccess={complete} submitLabel="Restablecer contraseña" pendingLabel="Restableciendo contraseña…"
        passwordLabel="Nueva contraseña" passwordDescriptionId={requirementsId} showPasswordToggle>
        {request}
        {login}
      </AuthForm>
    </section>
  )
}
