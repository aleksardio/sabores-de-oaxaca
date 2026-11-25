import { Link } from 'react-router'
import DishIllustration from '../components/DishIllustration.jsx'
import RecipeCard from '../components/RecipeCard.jsx'
import ShareRecipeAction from '../components/ShareRecipeAction.jsx'
import RequestError from '../components/RequestError.jsx'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { useRecipeCovers } from '../hooks/useRecipeCovers.js'
import { getRecipes } from '../services/recipesService.js'
import '../styles/home.css'

const loadRecipes = (signal) => getRecipes({ tamano: 3 }, signal)

export default function HomePage() {
  const { data, error, loading, retry } = usePublicRequest(loadRecipes)
  const covers = useRecipeCovers(data?.contenido, 'home')
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
            <ShareRecipeAction className="site-button site-button--green">Compartir mi receta</ShareRecipeAction>
          </div>
        </div>
        <DishIllustration label="Mole negro · tradición viva" tone="hero" decorative={false} />
      </section>

      <section className="home-featured" aria-labelledby="featured-title">
        <h2 id="featured-title">Recetas para descubrir</h2>
        <div className="home-featured__content">
          {loading && <p role="status">Cargando recetas…</p>}
          {error && <RequestError error={error} onRetry={retry} />}
          {data && (data.contenido.length ? (
            <ul className="featured-grid" role="list">
              {data.contenido.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} image={covers?.[recipe.id]} />)}
            </ul>
          ) : <p role="status">Aún no hay recetas para descubrir.</p>)}
          <Link to="/recetas">Ver catálogo de recetas</Link>
        </div>
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
