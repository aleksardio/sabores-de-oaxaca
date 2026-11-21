import { Link } from 'react-router'
import AuthForm from '../components/AuthForm.jsx'
import { validateRegistration } from '../utils/authValidation.js'

const fields = ['displayName', 'email', 'password', 'confirmation']

export default function RegisterPage() {
  return (
    <section className="auth-page">
      <h1 tabIndex={-1}>Crea tu cuenta</h1>
      <p className="auth-description">Únete a una comunidad que conserva el sabor de Oaxaca.</p>
      <AuthForm fields={fields} validate={validateRegistration} submitLabel="Crear mi cuenta">
        <Link className="site-button" to="/login">Ya tengo cuenta: iniciar sesión</Link>
      </AuthForm>
    </section>
  )
}
