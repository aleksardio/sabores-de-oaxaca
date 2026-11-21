import { Link } from 'react-router'

export default function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">Cocina tradicional oaxaqueña</p>
      <h1>Sabores de Oaxaca</h1>
      <p>
        Un proyecto universitario para descubrir y compartir la cocina de Oaxaca.
        Conoce algunos de los platillos y bebidas que dan inicio al catálogo.
      </p>
      <Link className="button" to="/recetas">Explorar recetas</Link>
    </section>
  )
}
