import { Link } from 'react-router'
import AuthForm from '../components/AuthForm.jsx'
import { validateRecovery } from '../utils/authValidation.js'

const fields = ['email']

export default function ForgotPasswordPage() {
  return (
    <section className="auth-page">
      <h1 tabIndex={-1}>Recuperar contraseña</h1>
      <p className="auth-description">Indica el correo en el que quieres recibir el enlace de recuperación.</p>
      <AuthForm fields={fields} validate={validateRecovery} submitLabel="Enviar enlace de recuperación">
        <Link className="site-button" to="/login">Regresar al inicio de sesión</Link>
      </AuthForm>
    </section>
  )
}
