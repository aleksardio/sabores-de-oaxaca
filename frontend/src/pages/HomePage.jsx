import { Link } from 'react-router'
import RecipeCard, { DishIllustration } from '../components/RecipeCard.jsx'
import '../styles/home.css'

const featuredRecipes = [
  {
    id: 'mole-negro',
    title: 'Mole negro',
    region: 'Valles Centrales',
    time: '3 h',
    description: 'Una receta de fiesta con historia.',
  },
  {
    id: 'tlayuda',
    title: 'Tlayuda tradicional',
    region: 'Valles Centrales',
    time: '35 min',
    description: 'Asiento, frijoles y quesillo.',
  },
  {
    id: 'tamales-de-chepil',
    title: 'Tamales de chepil',
    region: 'Sierra Norte',
    time: '1 h',
    description: 'Cocina de nuestras abuelas.',
    tone: 'green',
  },
]

export default function HomePage() {
  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__message">
          <p className="home-hero__eyebrow">TRADICIÓN · SABOR · COMUNIDAD</p>
          <h1 id="home-title">Cada receta cuenta una historia de Oaxaca.</h1>
          <p className="home-hero__intro">
            Descubre platillos heredados, prepara porciones a tu medida y comparte los secretos culinarios de nuestra tierra.
          </p>
          <div className="home-hero__actions">
            <Link className="site-button site-button--clay" to="/recetas">Explorar recetas</Link>
            <button className="site-button site-button--green" type="button" disabled title="Publicar recetas aún no está disponible">
              Compartir mi receta
            </button>
          </div>
        </div>
        <DishIllustration label="Mole negro · tradición viva" tone="hero" decorative={false} />
      </section>

      <section className="home-featured" aria-labelledby="featured-title">
        <h2 id="featured-title">Los sabores que unen a nuestra gente</h2>
        <ul className="featured-grid">
          {featuredRecipes.map((recipe) => <RecipeCard key={recipe.id} {...recipe} />)}
        </ul>
      </section>

      <section className="home-regions" aria-labelledby="regions-title">
        <h2 id="regions-title">Ocho regiones, cientos de formas de cocinar</h2>
        <Link className="site-button site-button--green" to="/tradiciones#regiones">
          Conocer las regiones
        </Link>
      </section>
    </>
  )
}
