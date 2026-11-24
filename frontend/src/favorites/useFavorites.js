import { createContext, useContext, useSyncExternalStore } from 'react'

export const FavoritesContext = createContext(null)
const noop = () => {}
const noSnapshot = () => null

export function useFavorites() {
  const store = useContext(FavoritesContext)
  const state = useSyncExternalStore(store?.subscribe ?? noop, store?.getSnapshot ?? noSnapshot,
    store?.getSnapshot ?? noSnapshot)
  return state && { ...state, load: store.load, toggle: store.toggle }
}
