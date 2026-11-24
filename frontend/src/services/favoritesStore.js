export function createFavoritesStore(service) {
  const listeners = new Set()
  let state = { recipes: null, loading: false, error: null, pending: new Set(), failures: new Map() }
  let refreshQueued = false

  function update(changes) {
    state = { ...state, ...changes }
    listeners.forEach((listener) => listener())
  }

  async function load() {
    if (state.loading) return
    if (state.pending.size) {
      refreshQueued = true
      return
    }
    update({ loading: true, error: null })
    try {
      update({ recipes: await service.list(), loading: false, failures: new Map() })
    } catch (error) {
      update({ loading: false, error })
    }
  }

  async function toggle(recipe) {
    const { id } = recipe
    if (!state.recipes || state.loading || state.error || state.pending.has(id)) return
    const removing = state.recipes.some((favorite) => favorite.id === id)
    const failures = new Map(state.failures)
    failures.delete(id)
    update({ pending: new Set(state.pending).add(id), failures })
    try {
      if (removing) await service.remove(id)
      else await service.add(id)
      update({ recipes: removing ? state.recipes.filter((favorite) => favorite.id !== id) : [recipe, ...state.recipes] })
    } catch (error) {
      update({ failures: new Map(state.failures).set(id, error) })
    } finally {
      const pending = new Set(state.pending)
      pending.delete(id)
      update({ pending })
      if (refreshQueued && !pending.size) {
        refreshQueued = false
        void load()
      }
    }
  }

  return {
    load,
    toggle,
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
