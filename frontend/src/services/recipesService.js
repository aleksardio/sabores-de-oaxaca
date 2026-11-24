import { ApiError, apiRequest } from './apiClient.js'

export const recipeTypes = [
  { value: '', label: 'Todas las recetas' },
  { value: 'TRADICIONAL_OAXAQUENA', label: 'Tradicionales', name: 'Tradicional oaxaqueña' },
  { value: 'COMUN', label: 'Comunes', name: 'Receta común' },
]

const positive = (value) => Number.isSafeInteger(value) && value > 0
const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0
const text = (value) => typeof value === 'string'
const optionalText = (value) => value == null || text(value)
const named = (value) => text(value) && Boolean(value.trim())
const decimal = (value) => Number.isFinite(value) && value >= 0
const list = (value, validate) => Array.isArray(value) && value.every(validate)
const isCategory = (value) => positive(value?.id) && named(value.nombre) && optionalText(value.descripcion)
const isType = (value) => Boolean(value) && recipeTypes.some((type) => type.value === value)
const isAuthor = (value) => value == null || (positive(value.id) && named(value.nombreVisible))
const isSummary = (value) => positive(value?.id) && named(value.titulo) && optionalText(value.descripcion)
  && (value.tipo == null || isType(value.tipo)) && positive(value.porcionesBase)
  && isAuthor(value.autor) && list(value.categorias, isCategory)

export function parseRecipeId(value) {
  const id = /^\d+$/.test(value) ? Number(value) : 0
  return positive(id) ? id : null
}

export function validServings(value) {
  return positive(value) && value <= 100
}

export function readCatalogFilters(params) {
  const pageParam = params.get('pagina') ?? ''
  const page = /^\d+$/.test(pageParam) ? Number(pageParam) : 0
  const type = params.get('tipo')
  return {
    titulo: (params.get('titulo') ?? '').slice(0, 200).trim(),
    categoria: parseRecipeId(params.get('categoria')),
    tipo: isType(type) ? type : '',
    pagina: nonnegative(page) && page <= 2147483647 ? page : 0,
  }
}

function unexpected() {
  return new ApiError(200, 'El servidor devolvió una respuesta inesperada.')
}

async function publicRequest(path, signal) {
  signal?.throwIfAborted()
  const data = await apiRequest(path, {
    signal,
    errors: { 400: 'Parámetros inválidos. Revisa los filtros o la cantidad de porciones.' },
  })
  signal?.throwIfAborted()
  return data
}

export async function getRecipes({ titulo, categoria, tipo, pagina = 0, tamano = 6 } = {}, signal) {
  const params = new URLSearchParams({ pagina, tamano })
  if (titulo) params.set('titulo', titulo)
  if (categoria) params.set('categoria', categoria)
  if (tipo) params.set('tipo', tipo)

  const data = await publicRequest(`/recetas?${params}`, signal)
  if (!list(data?.contenido, isSummary) || data.pagina !== pagina || data.tamano !== tamano
    || !nonnegative(data.totalElementos) || !nonnegative(data.totalPaginas)) throw unexpected()
  return data
}

export async function getCategories(signal) {
  const data = await publicRequest('/categorias', signal)
  if (!list(data, isCategory)) throw unexpected()
  return data
}

export async function getIngredients(signal) {
  const data = await publicRequest('/ingredientes', signal)
  if (!list(data, (row) => positive(row?.id) && named(row.nombre))
    || new Set(data.map(({ id }) => id)).size !== data.length) throw unexpected()
  return data
}

export async function getRecipeById(id, servings, signal) {
  if (!positive(id)) throw new RangeError('El ID debe ser un entero positivo.')
  if (servings !== undefined && !validServings(servings)) {
    throw new RangeError('Las porciones deben ser un entero de 1 a 100.')
  }
  const params = new URLSearchParams()
  if (servings !== undefined) params.set('porciones', servings)
  const data = await publicRequest(`/recetas/${id}${params.size ? `?${params}` : ''}`, signal)
  const isIngredient = (row) => positive(row?.id) && named(row.nombre) && named(row.unidad)
    && positive(row.orden) && optionalText(row.nota) && (row.unidad === 'AL_GUSTO'
    ? row.cantidadBase === null && row.cantidadAjustada === null
    : decimal(row.cantidadBase) && (servings === undefined ? row.cantidadAjustada === null : decimal(row.cantidadAjustada)))
  const isMedia = (item) => positive(item?.id) && named(item.tipo) && positive(item.orden)
    && optionalText(item.url) && optionalText(item.textoAlternativo)
  if (!isSummary(data) || data.id !== id || data.porcionesSolicitadas !== (servings ?? null)
    || !optionalText(data.preparacion) || !list(data.ingredientes, isIngredient)
    || !list(data.multimedia, isMedia)) throw unexpected()
  return data
}
