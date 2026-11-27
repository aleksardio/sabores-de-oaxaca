import { Link, useLocation } from 'react-router'
import { useFavorites } from '../favorites/useFavorites.js'
import '../styles/favorites.css'

function HeartIcon() {
  return (
    <svg className="favorite-button__icon" viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 21 4.4 13.5a5 5 0 0 1 7.1-7.1l.5.5.5-.5a5 5 0 0 1 7.1 7.1L12 21Z" />
    </svg>
  )
}

export default function FavoriteButton({ recipe }) {
  const favorites = useFavorites()
  const { pathname, search, hash } = useLocation()
  if (!favorites) {
    return <Link className="site-button favorite-button" to="/login" state={{ from: pathname + search + hash }}>
      <HeartIcon />
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
        <HeartIcon />
        {action}
      </button>
      {pending && <span role="status">Guardando…</span>}
      {error && <p role="alert">{error.message}</p>}
    </div>
  )
}
