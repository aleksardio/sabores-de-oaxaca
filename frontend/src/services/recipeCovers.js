import { recipeImage } from '../utils/publicRecipePresentation.js'
import { getRecipeById } from './recipesService.js'

// Una cola por listado; las portadas no forman parte del DTO de resumen.
export function createRecipeCoverQueue(onCover, load = getRecipeById) {
  const controller = new AbortController()
  const { signal } = controller
  const requested = new Set()
  const waiting = new Set()
  let active = 0

  function drain() {
    while (!signal.aborted && active < 3 && waiting.size) {
      const id = waiting.values().next().value
      waiting.delete(id)
      requested.add(id)
      active++
      void fetchCover(id)
    }
  }

  async function fetchCover(id) {
    try {
      const detail = await load(id, undefined, signal)
      if (!signal.aborted) onCover(id, recipeImage(detail.multimedia))
    } catch {
      // Un detalle no disponible no impide mostrar su tarjeta ni las demás.
    } finally {
      active--
      drain()
    }
  }

  return {
    show(ids) {
      waiting.clear()
      for (const id of ids) if (!requested.has(id)) waiting.add(id)
      queueMicrotask(drain)
    },
    cancel() {
      controller.abort()
      waiting.clear()
    },
  }
}
