import { ApiError } from './apiClient.js'

const path = '/favoritos'
const errors = {
  400: 'El identificador de la receta no es válido.',
  404: 'Esta receta ya no está disponible para agregar a favoritos.',
}

export function createFavoritesService(request) {
  const change = (id, method) => request(`${path}/${encodeURIComponent(id)}`, { method, expected: 204, errors })
  return {
    async list() {
      const recipes = await request(path)
      if (!Array.isArray(recipes)) throw new ApiError(200, 'El servidor devolvió una lista de favoritos inválida.')
      return recipes
    },
    add: (id) => change(id, 'POST'),
    remove: (id) => change(id, 'DELETE'),
  }
}
