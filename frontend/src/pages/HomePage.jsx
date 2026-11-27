import { Link } from 'react-router'
import PhotoCredits from '../components/PhotoCredits.jsx'
import RecipeCard from '../components/RecipeCard.jsx'
import ShareRecipeAction from '../components/ShareRecipeAction.jsx'
import RequestError from '../components/RequestError.jsx'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { useRecipeCovers } from '../hooks/useRecipeCovers.js'
import { getRecipeById, getRecipes } from '../services/recipesService.js'
import { recipeImage } from '../utils/publicRecipePresentation.js'
import { splitRecipeDescription } from '../utils/recipeDescription.js'
import '../styles/home.css'

const loadRecipes = (signal) => getRecipes({ tamano: 3 }, signal)
const traditional = 'TRADICIONAL_OAXAQUENA'
const preferredRecipe = 9

async function loadTraditionalPhoto(id, signal) {
  try {
    const recipe = await getRecipeById(id, undefined, signal)
    const image = recipeImage(recipe.multimedia)
    if (recipe.tipo !== traditional || !image) return null
    const photo = new Image()
    photo.src = image.src
    await photo.decode()
    return { recipe, image, credits: splitRecipeDescription(recipe.descripcion).credits }
  } catch {
    signal.throwIfAborted()
    return null
  }
}

async function loadHeroRecipe(signal) {
  const preferred = await loadTraditionalPhoto(preferredRecipe, signal)
  if (preferred) return preferred

  for (let pagina = 0; ; pagina++) {
    const result = await getRecipes({ tipo: traditional, pagina }, signal)
    for (const { id } of result.contenido) {
      if (id === preferredRecipe) continue
      const featured = await loadTraditionalPhoto(id, signal)
      if (featured) return featured
    }
    if (pagina + 1 >= result.totalPaginas) return null
  }
}

export default function HomePage() {
  const { data, error, loading, retry } = usePublicRequest(loadRecipes)
  const covers = useRecipeCovers(data?.contenido, 'home')
  const { data: hero, loading: loadingHero } = usePublicRequest(loadHeroRecipe)
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
        {hero && (
          <figure className="home-hero__feature">
            <img src={hero.image.src} alt={hero.image.alt || hero.recipe.titulo} />
            <div className="home-hero__recipe">
              <div>
                <p className="home-hero__tag">Tradicional oaxaqueña</p>
                <h2>{hero.recipe.titulo}</h2>
              </div>
              <Link className="site-button" to={`/recetas/${hero.recipe.id}`}>Ver receta</Link>
            </div>
            {hero.credits.length > 0 && <PhotoCredits credits={hero.credits} />}
          </figure>
        )}
        {loadingHero && <div className="home-hero__placeholder" aria-hidden="true" />}
      </section>

      <section className="home-featured" aria-labelledby="featured-title">
        <header className="home-featured__header">
          <div>
            <p className="home-hero__eyebrow">Del recetario</p>
            <h2 id="featured-title">Recetas para descubrir</h2>
          </div>
          <Link className="site-button" to="/recetas">Ver catálogo de recetas</Link>
        </header>
        <div className="home-featured__content">
          {loading && <p role="status">Cargando recetas…</p>}
          {error && <RequestError error={error} onRetry={retry} />}
          {data && (data.contenido.length ? (
            <ul className="featured-grid" role="list">
              {data.contenido.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} image={covers?.[recipe.id]} />)}
            </ul>
          ) : <p role="status">Aún no hay recetas para descubrir.</p>)}
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
