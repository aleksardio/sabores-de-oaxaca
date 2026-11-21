import { Link } from 'react-router'
import AuthForm from '../components/AuthForm.jsx'
import { validateLogin } from '../utils/authValidation.js'

const fields = ['email', 'password']

export default function LoginPage() {
  return (
    <section className="auth-page">
      <h1 tabIndex={-1}>Bienvenido de nuevo</h1>
      <p className="auth-description">Inicia sesión para guardar y compartir recetas.</p>
      <AuthForm fields={fields} validate={validateLogin} submitLabel="Iniciar sesión" showPasswordToggle>
        <Link className="site-button" to="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>
        <Link className="site-button" to="/registro">Crear cuenta nueva</Link>
      </AuthForm>
    </section>
  )
}
