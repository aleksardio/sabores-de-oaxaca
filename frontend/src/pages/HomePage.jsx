import { Link } from 'react-router'
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

// The Figma artwork uses editable shapes and gradients rather than photos.
function DishIllustration({ label, tone = 'gold' }) {
  return (
    <div className={`dish-art dish-art--${tone}`} aria-hidden={tone !== 'hero' ? true : undefined}>
      <span className="dish-art__plate" />
      <span className="dish-art__dot" />
      <span>{label}</span>
    </div>
  )
}

function FeaturedRecipe({ recipe }) {
  return (
    <li className="featured-card">
      <DishIllustration label={recipe.title} tone={recipe.tone} />
      <div className="featured-card__tags">
        <span>{recipe.region}</span>
        <span>{recipe.time}</span>
      </div>
      <h3>{recipe.title}</h3>
      <p>{recipe.description}</p>
      <Link className="site-button featured-card__link" to={`/recetas/${recipe.id}`} aria-label={`Ver receta de ${recipe.title}`}>
        Ver receta <span aria-hidden="true">→</span>
      </Link>
    </li>
  )
}

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
        <DishIllustration label="Mole negro · tradición viva" tone="hero" />
      </section>

      <section className="home-featured" aria-labelledby="featured-title">
        <h2 id="featured-title">Los sabores que unen a nuestra gente</h2>
        <ul className="featured-grid">
          {featuredRecipes.map((recipe) => <FeaturedRecipe key={recipe.id} recipe={recipe} />)}
        </ul>
      </section>

      <section className="home-regions" aria-labelledby="regions-title">
        <h2 id="regions-title">Ocho regiones, cientos de formas de cocinar</h2>
        <button className="site-button site-button--green" type="button" disabled title="La página de tradiciones aún no está disponible">
          Conocer las regiones
        </button>
      </section>
    </>
  )
}
