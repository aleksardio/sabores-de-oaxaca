import { useEffect, useMemo } from 'react'
import { matchPath, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { createFavoritesService } from '../services/favoritesService.js'
import { createFavoritesStore } from '../services/favoritesStore.js'
import { FavoritesContext } from './useFavorites.js'

export default function FavoritesProvider({ children }) {
  const { user, requestAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const store = useMemo(() => user && createFavoritesStore(
    createFavoritesService((path, options) => requestAuthenticated(user, path, options)),
  ), [user, requestAuthenticated])

  useEffect(() => {
    if (matchPath('/favoritos', pathname) || matchPath('/recetas', pathname) || matchPath('/recetas/:id', pathname)) {
      void store?.load()
    }
  }, [store, pathname])

  return <FavoritesContext.Provider value={store}>{children}</FavoritesContext.Provider>
}
