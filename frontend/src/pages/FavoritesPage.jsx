import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import FavoriteButton from '../components/FavoriteButton.jsx'
import FavoritesStatus from '../components/FavoritesStatus.jsx'
import RecipeCard from '../components/RecipeCard.jsx'
import { useFavorites } from '../favorites/useFavorites.js'
import '../styles/community.css'
import '../styles/favorites.css'

export default function FavoritesPage() {
  const { user, notice } = useAuth()
  const favorites = useFavorites()
  const recipes = favorites?.error ? null : favorites?.recipes

  return (
    <section className="community-page" aria-labelledby="favorites-title">
      <div className="community-panel community-panel--hero community-panel--favorites">
        <div>
          <p className="community-eyebrow">Tu recetario personal</p>
          <h1 id="favorites-title">Mis recetas favoritas</h1>
          {!user && <p>{notice || 'Inicia sesión para consultar y guardar tus recetas favoritas.'}</p>}
          <div className="community-actions">
            {!user && <Link className="site-button site-button--green" to="/login" state={{ from: '/favoritos' }}>Iniciar sesión</Link>}
            <Link className="site-button" to="/recetas">Explorar el catálogo</Link>
          </div>
        </div>
        <div className="community-favorites-art" aria-hidden="true">♡</div>
      </div>
      <FavoritesStatus />
      {!favorites?.loading && recipes?.length === 0 && <p role="status">Aún no tienes recetas favoritas.</p>}
      {recipes?.length > 0 && (
        <ul className="favorites-grid" aria-label="Recetas favoritas" role="list">
          {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe}
            favoriteAction={<FavoriteButton recipe={recipe} />} />)}
        </ul>
      )}
    </section>
  )
}
