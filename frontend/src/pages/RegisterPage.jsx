import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import AuthForm from '../components/AuthForm.jsx'
import GoogleLoginButton from '../components/GoogleLoginButton.jsx'
import { useAuth } from '../auth/useAuth.js'
import { register } from '../services/authService.js'
import { getAuthDestination } from '../utils/authDestination.js'
import { validateRegistration } from '../utils/authValidation.js'

const fields = ['displayName', 'email', 'password', 'confirmation']

export default function RegisterPage() {
  const [registered, setRegistered] = useState(false)
  const { user, signInWithGoogle } = useAuth()
  const { state } = useLocation()
  const loginState = { from: getAuthDestination(state?.from) }

  if (user) return <Navigate to={loginState.from} replace />

  if (registered) {
    return (
      <section className="auth-page">
        <h1 tabIndex={-1} ref={(heading) => { heading?.focus() }}>Cuenta creada</h1>
        <p className="auth-description">Tu registro fue exitoso. Inicia sesión para consultar tu perfil.</p>
        <Link className="site-button site-button--green" to="/login" state={loginState}>Iniciar sesión</Link>
      </section>
    )
  }

  return (
    <section className="auth-page">
      <h1 tabIndex={-1}>Crea tu cuenta</h1>
      <p className="auth-description">Únete a una comunidad que conserva el sabor de Oaxaca.</p>
      <AuthForm fields={fields} validate={validateRegistration} onSubmit={register} onSuccess={() => setRegistered(true)} submitLabel="Crear mi cuenta" pendingLabel="Creando cuenta…">
        <Link className="site-button" to="/login" state={loginState}>Ya tengo cuenta: iniciar sesión</Link>
      </AuthForm>
      <GoogleLoginButton onSignIn={signInWithGoogle} />
    </section>
  )
}
