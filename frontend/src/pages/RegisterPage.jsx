import { Link } from 'react-router'

export default function RegisterPage() {
  return (
    <section>
      <h1>Registro de usuario</h1>
      <p>La creación de cuentas todavía no está disponible.</p>
      <Link to="/login">Ir a inicio de sesión</Link>
    </section>
  )
}
