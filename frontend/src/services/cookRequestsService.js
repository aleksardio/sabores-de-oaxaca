import { ApiError } from './apiClient.js'

const valid = (s) => Number.isSafeInteger(s?.id) && s.id > 0 && Number.isSafeInteger(s.usuarioId)
  && typeof s.nombre === 'string' && ['PENDIENTE', 'APROBADA', 'RECHAZADA'].includes(s.estado)

export function createCookRequestsService(requestAuthenticated, user) {
  async function request(path, options = {}) {
    if (!user) throw new ApiError(401, 'Inicia sesión de nuevo.')
    return requestAuthenticated(user, path, { ...options, discardStaleErrors: true })
  }
  return {
    async own(signal) {
      const data = await request('/solicitud-cocinero', { signal })
      if (!data || (data.solicitud !== null && !valid(data.solicitud))) throw new ApiError(200, 'Respuesta inesperada.')
      return data.solicitud
    },
    async send() {
      const data = await request('/solicitud-cocinero', { method: 'POST' })
      if (!valid(data) || data.estado !== 'PENDIENTE') throw new ApiError(200, 'Respuesta inesperada.')
      return data
    },
    async pending(page, signal) {
      const data = await request(`/admin/solicitudes-cocinero?pagina=${page}`, { signal })
      if (!Array.isArray(data) || !data.every((s) => valid(s) && s.estado === 'PENDIENTE')) throw new ApiError(200, 'Respuesta inesperada.')
      return data
    },
    async decide(id, action) {
      if (!Number.isSafeInteger(id) || id < 1 || !['aprobar', 'rechazar'].includes(action)) throw new ApiError(400, 'Acción inválida.')
      const data = await request(`/admin/solicitudes-cocinero/${id}/${action}`, { method: 'POST' })
      if (!valid(data) || data.id !== id || data.estado !== (action === 'aprobar' ? 'APROBADA' : 'RECHAZADA')) throw new ApiError(200, 'Respuesta inesperada.')
      return data
    },
  }
}

export function cookRequestError(error) {
  if (error?.status === 401) return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.'
  if (error?.status === 403) return 'No tienes autorización para esta acción.'
  if (error?.status === 409) return 'El estado cambió o la cuenta está inactiva. Actualiza la información.'
  return 'No se pudo completar la solicitud. Consulta el estado antes de volver a intentar.'
}
