import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import AuthForm from '../components/AuthForm.jsx'
import { getAuthDestination } from '../utils/authDestination.js'
import { validateLogin } from '../utils/authValidation.js'

const fields = ['email', 'password']

export default function LoginPage() {
  const { user, signIn, notice } = useAuth()
  const { state } = useLocation()
  const destination = getAuthDestination(state?.from)

  if (user) return <Navigate to={destination} replace />

  return (
    <section className="auth-page">
      <h1 tabIndex={-1}>Bienvenido de nuevo</h1>
      <p className="auth-description">Inicia sesión para consultar tu perfil.</p>
      {notice && <p role="status">{notice}</p>}
      <AuthForm fields={fields} validate={validateLogin} onSubmit={signIn} submitLabel="Iniciar sesión" pendingLabel="Iniciando sesión…" showPasswordToggle>
        <Link className="site-button" to="/recuperar-contrasena" state={{ from: destination }}>¿Olvidaste tu contraseña?</Link>
        <Link className="site-button" to="/registro" state={{ from: destination }}>Crear cuenta nueva</Link>
      </AuthForm>
    </section>
  )
}
