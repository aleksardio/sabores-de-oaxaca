import { ingredientUnits, mediaTypes, recipeTypes } from '../data/recipeEditorOptions.js'
import { canModerate, isOwnModerationRecipe, validateRejectionReason } from '../utils/moderationAccess.js'
import { ApiError } from './apiClient.js'

export const moderationPageSize = 12
export const unavailableRecipe = 'La receta no existe o ya no está disponible para moderación.'
const base = '/moderacion/recetas'
const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0
const positive = (value) => nonnegative(value) && value > 0
const text = (value) => typeof value === 'string'
const nullableText = (value) => value === null || text(value)
const list = (value, check) => Array.isArray(value) && value.every(check)
const isSummary = (row) => positive(row?.id) && text(row.titulo) && Object.hasOwn(recipeTypes, row.tipo)
  && positive(row.autorId) && text(row.autor) && nonnegative(row.version)
const isCategory = (row) => positive(row?.id) && text(row.nombre) && nullableText(row.descripcion)
const isIngredient = (row) => positive(row?.id) && text(row.nombre) && positive(row.orden)
  && Object.hasOwn(ingredientUnits, row.unidad) && nullableText(row.nota) && row.cantidadAjustada === null
  && (row.unidad === 'AL_GUSTO' ? row.cantidadBase === null : Number.isFinite(row.cantidadBase) && row.cantidadBase > 0)
const isMedia = (row) => positive(row?.id) && positive(row.orden) && Object.hasOwn(mediaTypes, row.tipo)
  && nullableText(row.url) && nullableText(row.textoAlternativo)

const errors = {
  403: 'Acceso denegado. Tu cuenta no puede realizar esta operación; no se permite moderar recetas propias.',
  404: unavailableRecipe,
  409: 'La receta cambió o no admite la operación.',
}

// La misma sesión puede desmontar y volver a abrir un detalle antes de que termine un POST.
const writesByUser = new WeakMap()

export function createModerationService(requestAuthenticated, user) {
  const writes = user ? (writesByUser.get(user) ?? new Map()) : new Map()
  if (user) writesByUser.set(user, writes)

  async function request(path, options, validate, invalidInput) {
    if (!user) throw new ApiError(401, 'Inicia sesión para acceder a moderación.')
    if (!canModerate(user)) throw new ApiError(403, errors[403])
    options.signal?.throwIfAborted()
    const result = await requestAuthenticated(user, path, { ...options, errors: { ...errors, 400: invalidInput } })
    options.signal?.throwIfAborted()
    if (!validate(result)) throw new ApiError(200, 'El servidor devolvió una respuesta inesperada.')
    return result
  }

  function pathFor(id) {
    if (!positive(id)) throw new ApiError(400, 'El identificador de receta no es válido.')
    return `${base}/${id}`
  }

  async function decide(recipe, action, estado, body, signal) {
    if (isOwnModerationRecipe(user, recipe)) throw new ApiError(403, errors[403])
    const { id, version } = recipe
    if (recipe.estado !== 'PENDIENTE' || !nonnegative(version)) throw new ApiError(400, 'Consulta la versión pendiente antes de decidir.')
    if (writes.has(id)) throw new ApiError(409, errors[409])
    const submission = request(`${pathFor(id)}/${action}`, {
      method: 'POST', ifMatch: `"${version}"`, ...(body && { body }), signal,
    }, (data) => data?.id === id && data.estado === estado && nonnegative(data.version) && data.version > version,
    'La API rechazó la versión de la receta o el motivo. Revisa los datos antes de intentar otra decisión.')
    writes.set(id, submission)
    try {
      return await submission
    } finally {
      writes.delete(id)
    }
  }

  return {
    async list(pagina = 0, tipo = '', signal) {
      const invalidFilters = 'Los filtros de moderación no son válidos.'
      if (!nonnegative(pagina) || pagina * moderationPageSize > 2147483647 || (tipo !== '' && !Object.hasOwn(recipeTypes, tipo))) {
        throw new ApiError(400, invalidFilters)
      }
      const query = new URLSearchParams({ pagina, tamano: moderationPageSize })
      if (tipo) query.set('tipo', tipo)
      return request(`${base}?${query}`, { signal }, (data) => list(data?.contenido, isSummary)
        && data.pagina === pagina && data.tamano === moderationPageSize
        && nonnegative(data.totalElementos) && nonnegative(data.totalPaginas), invalidFilters)
    },
    async detail(id, signal) {
      const pending = writes.get(id)
      if (pending) await Promise.allSettled([pending])
      return request(pathFor(id), { signal }, (data) => isSummary(data) && data.id === id && data.estado === 'PENDIENTE'
        && text(data.descripcion) && text(data.preparacion) && positive(data.porcionesBase)
        && list(data.categorias, isCategory) && list(data.ingredientes, isIngredient) && list(data.multimedia, isMedia),
      'La API no aceptó el identificador de receta.')
    },
    approve(recipe, signal) {
      return decide(recipe, 'aprobar', 'PUBLICADA', undefined, signal)
    },
    async reject(recipe, reason = '', signal) {
      const problem = validateRejectionReason(reason)
      if (problem) throw new ApiError(400, problem)
      return decide(recipe, 'rechazar', 'RECHAZADA', { motivo: reason.trim() }, signal)
    },
  }
}
