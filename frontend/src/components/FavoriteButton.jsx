import { Link, useLocation } from 'react-router'
import { useFavorites } from '../favorites/useFavorites.js'
import '../styles/favorites.css'

export default function FavoriteButton({ recipe }) {
  const favorites = useFavorites()
  const { pathname, search, hash } = useLocation()
  if (!favorites) {
    return <Link className="site-button favorite-button" to="/login" state={{ from: pathname + search + hash }}>
      Inicia sesión para guardar
    </Link>
  }
  if (!favorites.recipes || favorites.error) return null

  const selected = favorites.recipes.some(({ id }) => id === recipe.id)
  const pending = favorites.pending.has(recipe.id)
  const error = favorites.failures.get(recipe.id)
  const action = selected ? 'Quitar de favoritos' : 'Agregar a favoritos'
  return (
    <div className="favorite-control">
      <button className="site-button favorite-button" type="button" data-favorite={selected}
        aria-label={`${action}: ${recipe.titulo}`} disabled={pending || favorites.loading}
        onClick={() => { void favorites.toggle(recipe) }}>
        {action}
      </button>
      {pending && <span role="status">Guardando…</span>}
      {error && <p role="alert">{error.message}</p>}
    </div>
  )
}
