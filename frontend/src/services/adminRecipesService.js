import { ApiError } from './apiClient.js'

const states = ['BORRADOR', 'PENDIENTE', 'PUBLICADA', 'RECHAZADA', 'ARCHIVADA']
const valid = (r) => Number.isSafeInteger(r?.id) && r.id > 0 && typeof r.titulo === 'string'
  && typeof r.autor === 'string' && states.includes(r.estado) && Number.isSafeInteger(r.version) && r.version >= 0
  && (r.eliminadoEn === null || typeof r.eliminadoEn === 'string') && typeof r.creadoEn === 'string'

export function createAdminRecipesService(requestAuthenticated, user) {
  async function request(path, options = {}) {
    if (!user) throw new ApiError(401, 'Tu sesión ya no es válida.')
    return requestAuthenticated(user, path, { ...options, discardStaleErrors: true })
  }
  return {
    async list(filters, signal) {
      const params = new URLSearchParams({ pagina: filters.pagina, tamano: 20 })
      if (filters.texto.trim()) params.set('texto', filters.texto.trim())
      if (filters.estado) params.set('estado', filters.estado)
      if (filters.baja !== '') params.set('baja', filters.baja)
      const data = await request(`/admin/recetas?${params}`, { signal })
      if (!Array.isArray(data?.contenido) || !data.contenido.every(valid) || data.pagina !== filters.pagina
        || !Number.isSafeInteger(data.totalPaginas) || !Number.isSafeInteger(data.totalElementos)) throw new ApiError(200, 'Respuesta inesperada del servidor.')
      return data
    },
    async change(recipe, detail) {
      if (!valid(recipe) || typeof detail !== 'string' || !detail.trim() || detail.trim().length > 1000) throw new ApiError(400, 'Justificación inválida.')
      const action = recipe.eliminadoEn === null ? 'baja' : 'restaurar'
      const data = await request(`/admin/recetas/${recipe.id}/${action}`, {
        method: 'POST', ifMatch: `"${recipe.version}"`, body: { detalle: detail.trim() },
      })
      const expectedState = action === 'restaurar' && recipe.estado === 'PUBLICADA' ? 'PENDIENTE' : recipe.estado
      if (!valid(data) || data.id !== recipe.id || data.version <= recipe.version || data.estado !== expectedState
        || (action === 'baja' ? data.eliminadoEn === null : data.eliminadoEn !== null)) throw new ApiError(200, 'No se pudo confirmar la operación.')
      return data
    },
  }
}

export function adminRecipeError(error) {
  if (error?.status === 401) return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.'
  if (error?.status === 403) return 'No tienes autorización para administrar recetas.'
  if (error?.status === 404) return 'La receta ya no existe.'
  if (error?.status === 409) return 'La receta cambió. Actualiza el listado antes de intentar de nuevo.'
  if (error?.status === 400) return 'Revisa los filtros o la justificación.'
  return 'No se pudo completar la solicitud. Actualiza el listado antes de intentar de nuevo.'
}
