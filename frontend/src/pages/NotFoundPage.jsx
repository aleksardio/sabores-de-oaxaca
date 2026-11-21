import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section>
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a una página del proyecto.</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  )
}
