import { ingredientUnits, mediaTypes, recipeTypes } from '../data/recipeEditorOptions.js'
import { isReviewableRecipe } from './cookRecipeRules.js'

export const maxItems = { categories: 100, ingredients: 500, multimedia: 100 }
export const blankDraft = {
  title: '', description: '', preparation: '', type: '', baseServings: '',
  categories: [], ingredients: [], multimedia: [],
}

export function normalizeRecipeText(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function changeIngredientUnit(ingredient, unit) {
  return { ...ingredient, unit, quantity: unit === 'AL_GUSTO' ? null : ingredient.quantity ?? '' }
}

export const positiveInteger = (value, max = Number.MAX_SAFE_INTEGER) =>
  /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= max

export function nextOrder(rows) {
  const used = new Set(rows.map(({ order }) => Number(order)))
  let order = 1
  while (used.has(order)) order++
  const last = Math.max(0, ...rows.filter((row) => positiveInteger(row.order, 2147483647)).map((row) => Number(row.order)))
  return String(last < 2147483647 ? last + 1 : order)
}

export const pendingMediaMessage = 'Sube o quita los archivos pendientes antes de guardar o enviar a revisión.'
export const hasPendingMedia = (draft) => draft.multimedia?.some((row) => Boolean(row.local)) ?? false

export function isHttpsMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || !/^https:\/\/[^/\\]/.test(value)
    || /[\s\\<>"{}|^`]|%(?![\da-f]{2})/iu.test(value)) return false
  try {
    const host = value.slice(8).split(/[/?#]/u, 1)[0]
    const url = new URL(value)
    return !host.includes('@') && (host.startsWith('[') || /^[a-z\d.-]+(?::\d+)?$/i.test(host))
      && (url.hostname.startsWith('[') || url.hostname.replace(/\.$/, '').split('.').every(
        (label) => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
      ))
  } catch {
    return false
  }
}

export function validateRecipeDraft(recipe) {
  const errors = {}
  for (const [field, label, limit] of [
    ['title', 'el título', 200], ['description', 'la descripción', 65535], ['preparation', 'la preparación', 16777215],
  ]) {
    if (!recipe[field].trim()) errors[field] = `Escribe ${label} de la receta.`
    else if (recipe[field].length > limit) errors[field] = `El límite es de ${limit} caracteres.`
  }
  if (!Object.hasOwn(recipeTypes, recipe.type)) errors.type = 'Selecciona un tipo de receta.'
  const javaIntMax = 2147483647
  if (!positiveInteger(recipe.baseServings, javaIntMax)) errors.baseServings = 'Escribe un entero entre 1 y 2 147 483 647.'

  for (const [field, limit] of Object.entries(maxItems)) {
    if (!Array.isArray(recipe[field]) || recipe[field].length > limit) errors[field] = `Se requiere una lista de hasta ${limit} elementos.`
  }
  if (Array.isArray(recipe.categories) && (!recipe.categories.every(({ id }) => positiveInteger(id))
    || new Set(recipe.categories.map(({ id }) => Number(id))).size !== recipe.categories.length)) {
    errors.categories = 'Las categorías deben tener IDs positivos y distintos.'
  }

  function uniquePositive(value, seen, key, label, max) {
    if (!positiveInteger(value, max)) errors[key] = `${label}: escribe un entero positivo válido.`
    else if (seen.has(Number(value))) errors[key] = `${label} repetido.`
    else seen.add(Number(value))
  }

  const ids = new Set()
  const ingredientOrders = new Set()
  if (Array.isArray(recipe.ingredients)) recipe.ingredients.forEach(({ id, ingredientId, unit, quantity, note, order }) => {
    const prefix = `ingredient-${id}`
    const ingredientKey = `${prefix}-ingredientId`
    if (!positiveInteger(ingredientId)) errors[ingredientKey] = 'Selecciona un ingrediente.'
    else if (ids.has(Number(ingredientId))) errors[ingredientKey] = 'Ingrediente repetido.'
    else ids.add(Number(ingredientId))
    uniquePositive(order, ingredientOrders, `${prefix}-order`, 'Orden', javaIntMax)
    if (!Object.hasOwn(ingredientUnits, unit)) errors[`${prefix}-unit`] = 'Selecciona una unidad válida.'
    else if (unit === 'AL_GUSTO' && quantity !== null) errors[`${prefix}-unit`] = 'Al gusto requiere cantidad nula.'
    else if (unit !== 'AL_GUSTO' && (!/^\d{1,9}(?:[.,]\d{1,3})?$/.test(quantity) || !/[1-9]/.test(quantity))) {
      errors[`${prefix}-quantity`] = 'Escribe una cantidad positiva de hasta 9 dígitos enteros y 3 decimales.'
    }
    if (note.length > 255) errors[`${prefix}-note`] = 'La nota admite hasta 255 caracteres.'
  })

  const mediaOrders = new Set()
  if (hasPendingMedia(recipe)) errors.multimedia ??= pendingMediaMessage
  if (Array.isArray(recipe.multimedia)) recipe.multimedia.forEach(({ id, type, url, alt, order, local }) => {
    const prefix = `media-${id}`
    uniquePositive(order, mediaOrders, `${prefix}-order`, 'Orden', javaIntMax)
    if (!Object.hasOwn(mediaTypes, type)) errors[`${prefix}-type`] = 'Selecciona Imagen o Video.'
    if (!local && !isHttpsMediaUrl(url)) errors[`${prefix}-url`] = 'La referencia debe tener una URL HTTPS válida de hasta 2048 caracteres, sin credenciales.'
    if (alt.length > 255) errors[`${prefix}-alt`] = 'El texto alternativo admite hasta 255 caracteres.'
  })
  return errors
}

export function validateRecipeForReview(recipe, record) {
  const errors = validateRecipeDraft(recipe)
  if (!isReviewableRecipe(record)) errors.state = 'Solo se puede enviar un borrador o una receta rechazada que no esté dada de baja.'
  if (!recipe.categories?.length) errors.categories ??= 'Selecciona al menos una categoría.'
  if (!recipe.ingredients?.length) errors.ingredients ??= 'Agrega al menos un ingrediente.'
  return errors
}

export function draftFromDetail(recipe) {
  return {
    title: recipe.titulo, description: recipe.descripcion, preparation: recipe.preparacion,
    type: recipe.tipo, baseServings: String(recipe.porcionesBase),
    categories: recipe.categorias,
    ingredients: recipe.ingredientes.map((row) => ({
      id: row.id, ingredientId: String(row.id), name: row.nombre, quantity: row.cantidadBase === null ? null : String(row.cantidadBase),
      unit: row.unidad, note: row.nota ?? '', order: String(row.orden),
    })),
    multimedia: recipe.multimedia.map((row) => ({
      id: row.id, type: row.tipo, url: row.url ?? '', alt: row.textoAlternativo ?? '', order: String(row.orden),
    })),
  }
}

function recipeBodyFields(draft) {
  return {
    titulo: draft.title, descripcion: draft.description, preparacion: draft.preparation, tipo: draft.type,
    porcionesBase: Number(draft.baseServings), categorias: draft.categories.map(({ id }) => Number(id)),
    ingredientes: draft.ingredients.map((row) => ({
      ingredienteId: Number(row.ingredientId), cantidad: row.quantity === null ? null : Number(String(row.quantity).replace(',', '.')),
      unidad: row.unit, orden: Number(row.order), nota: row.note || null,
    })),
    multimedia: draft.multimedia.map((row) => ({
      tipo: row.type, url: row.url, textoAlternativo: row.alt || null, orden: Number(row.order),
    })),
  }
}

export function toRecipeBody(draft) {
  if (hasPendingMedia(draft)) throw new Error(pendingMediaMessage)
  if (draft.multimedia.some(({ url }) => !isHttpsMediaUrl(url))) throw new Error('Hay referencias multimedia sin URL HTTPS válida.')
  return recipeBodyFields(draft)
}

export function changedRecipeBody(draft, baseline) {
  const body = toRecipeBody(draft)
  // El detalle anterior puede contener referencias antiguas inválidas: solo se lee para comparar.
  if (draft === baseline || JSON.stringify(body) === JSON.stringify(recipeBodyFields(baseline))) return null
  return body
}
