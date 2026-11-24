import { ApiError } from './apiClient.js'
import { ingredientUnits, recipeTypes, mediaTypes } from '../data/recipeEditorOptions.js'
import { recipeStates } from '../utils/cookRecipeRules.js'

export const cookPageSize = 12
const base = '/mis-recetas'
const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0
const positive = (value) => nonnegative(value) && value > 0
const text = (value) => typeof value === 'string'
const nullableText = (value) => value === null || text(value)
const list = (value, check) => Array.isArray(value) && value.every(check)
const isReceipt = (value) => positive(value?.id) && nonnegative(value.version) && Object.hasOwn(recipeStates, value.estado)
const isSummary = (value) => isReceipt(value) && text(value.titulo) && positive(value.porcionesBase)
  && Object.hasOwn(recipeTypes, value.tipo) && nullableText(value.eliminadoEn)
const isCategory = (row) => positive(row?.id) && text(row.nombre)
const isIngredient = (row) => positive(row?.id) && text(row.nombre) && positive(row.orden)
  && Object.hasOwn(ingredientUnits, row.unidad) && nullableText(row.nota)
  && (row.unidad === 'AL_GUSTO' ? row.cantidadBase === null : Number.isFinite(row.cantidadBase) && row.cantidadBase > 0)
const isMedia = (row) => positive(row?.id) && positive(row.orden) && Object.hasOwn(mediaTypes, row.tipo)
  && nullableText(row.url) && nullableText(row.textoAlternativo)

const errors = {
  400: 'La API rechazó los datos o las referencias. Revisa los campos y verifica que los IDs existan.',
  403: 'Acceso denegado. Tu cuenta no tiene autorización para esta operación.',
  404: 'La receta no existe o no está disponible para tu cuenta.',
  409: 'Los datos cambiaron o el estado no permite la operación. Consulta la versión del servidor antes de volver a intentar.',
}

// La sesión agrega Authorization mediante apiRequest; este servicio nunca recibe el JWT.
export function createCookRecipesService(requestAuthenticated, user) {
  async function request(path, options, validate) {
    const { signal, expected = 200 } = options
    signal?.throwIfAborted()
    const result = await requestAuthenticated(user, path, { ...options, errors })
    signal?.throwIfAborted()
    if (validate && !validate(result)) throw new ApiError(expected, 'El servidor devolvió una respuesta inesperada.')
    return result
  }

  function pathFor(id) {
    if (!positive(id)) throw new RangeError('El ID debe ser un entero positivo.')
    return `${base}/${id}`
  }

  function quotedVersion(version) {
    if (!nonnegative(version)) throw new RangeError('La versión debe ser un entero no negativo.')
    return `"${version}"`
  }

  return {
    async list(pagina = 0, signal) {
      const query = new URLSearchParams({ pagina, tamano: cookPageSize })
      return request(`${base}?${query}`, { signal }, (data) =>
        list(data?.contenido, isSummary) && data.pagina === pagina && data.tamano === cookPageSize
        && nonnegative(data.totalElementos) && nonnegative(data.totalPaginas))
    },
    async detail(id, signal) {
      return request(pathFor(id), { signal }, (data) => isSummary(data) && data.id === id
        && text(data.descripcion) && text(data.preparacion) && list(data.categorias, isCategory)
        && list(data.ingredientes, isIngredient) && list(data.multimedia, isMedia))
    },
    async create(body, signal) {
      return request(base, { method: 'POST', body, expected: 201, signal },
        (data) => isReceipt(data) && data.estado === 'BORRADOR')
    },
    async update(id, body, version, signal) {
      return request(pathFor(id), { method: 'PUT', body: { ...body, version }, signal },
        (data) => isReceipt(data) && data.id === id)
    },
    async remove(id, version, signal) {
      return request(pathFor(id), { method: 'DELETE', ifMatch: quotedVersion(version), expected: 204, signal })
    },
    async review(id, version, signal) {
      return request(`${pathFor(id)}/enviar-revision`, { method: 'POST', ifMatch: quotedVersion(version), signal },
        (data) => isReceipt(data) && data.id === id && data.estado === 'PENDIENTE')
    },
  }
}
