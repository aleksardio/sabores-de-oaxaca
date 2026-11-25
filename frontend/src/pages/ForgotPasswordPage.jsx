import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import AuthForm from '../components/AuthForm.jsx'
import { recoveryConfirmation, requestPasswordRecovery } from '../services/passwordRecoveryService.js'
import { getAuthDestination } from '../utils/authDestination.js'
import { validateRecoveryEmail } from '../utils/authValidation.js'

const fields = ['email']

export default function ForgotPasswordPage() {
  const { key, state } = useLocation()
  return <RecoveryForm key={key} destination={getAuthDestination(state?.from)} />
}

function RecoveryForm({ destination }) {
  const [confirmed, setConfirmed] = useState(false)
  const loginLink = <Link className="site-button" to="/login" state={{ from: destination }}>Regresar al inicio de sesión</Link>

  if (confirmed) {
    return (
      <section className="auth-page">
        <h1 tabIndex={-1} ref={(heading) => { heading?.focus() }}>Solicitud de recuperación</h1>
        <p className="auth-description" role="status">
          {recoveryConfirmation}. La entrega depende de la disponibilidad del servicio de correo.
        </p>
        {loginLink}
      </section>
    )
  }

  return (
    <section className="auth-page">
      <h1 tabIndex={-1}>Recuperar contraseña</h1>
      <p className="auth-description">Escribe el correo asociado a tu cuenta para solicitar instrucciones.</p>
      <AuthForm fields={fields} validate={validateRecoveryEmail} onSubmit={requestPasswordRecovery}
        onSuccess={() => setConfirmed(true)} submitLabel="Solicitar recuperación" pendingLabel="Solicitando recuperación…">
        {loginLink}
      </AuthForm>
    </section>
  )
}
