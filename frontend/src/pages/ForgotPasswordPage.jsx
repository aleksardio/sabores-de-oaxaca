import { Link, useLocation } from 'react-router'
import { getAuthDestination } from '../utils/authDestination.js'

export default function ForgotPasswordPage() {
  const { state } = useLocation()

  return (
    <section className="auth-page">
      <h1 tabIndex={-1}>Recuperar contraseña</h1>
      <p className="auth-description">La recuperación de contraseña todavía no está disponible. No se enviará ningún correo.</p>
      <Link className="site-button" to="/login" state={{ from: getAuthDestination(state?.from) }}>Regresar al inicio de sesión</Link>
    </section>
  )
}
