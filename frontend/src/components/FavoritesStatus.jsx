import { useFavorites } from '../favorites/useFavorites.js'
import RequestError from './RequestError.jsx'

export default function FavoritesStatus() {
  const favorites = useFavorites()
  if (!favorites) return null
  if (favorites.error) return <RequestError error={favorites.error} onRetry={favorites.load} retryLabel="Reintentar favoritos" />
  if (favorites.loading || !favorites.recipes) return <p role="status">Cargando favoritos…</p>
  return null
}
