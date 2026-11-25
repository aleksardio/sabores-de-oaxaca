import { maxItems, nextOrder, normalizeRecipeText } from './recipeEditorValidation.js'

export function searchIngredients(catalog, query) {
  const term = normalizeRecipeText(query)
  return term ? catalog.filter(({ nombre }) => normalizeRecipeText(nombre).includes(term)) : catalog
}

export function getIngredientChoices(catalog, rows, row, matches = catalog) {
  const used = new Set(rows.filter(({ id }) => id !== row?.id).map(({ ingredientId }) => Number(ingredientId)))
  const selectedId = Number(row?.ingredientId)
  const matchIds = new Set(matches?.map(({ id }) => id))
  const choices = (catalog ?? []).filter(({ id }) => matchIds.has(id) || id === selectedId)
    .map(({ id, nombre }) => ({ id, label: nombre, disabled: used.has(id) && id !== selectedId }))
  if (row?.ingredientId && !choices.some(({ id }) => id === selectedId)) {
    const name = row.name || `Ingrediente ID ${row.ingredientId}`
    choices.unshift({ id: selectedId, label: catalog ? `${name} (no disponible)` : name, disabled: true })
  }
  return choices
}

export function selectIngredient(catalog, rows, rowId, value) {
  const ingredient = catalog?.find(({ id }) => String(id) === value)
  if (!ingredient || rows.some(({ id, ingredientId }) => id !== rowId && Number(ingredientId) === ingredient.id)) return rows
  return rows.map((row) => row.id === rowId ? { ...row, ingredientId: value, name: ingredient.nombre } : row)
}

export function addIngredient(rows, ingredient, rowId) {
  if (rows.length >= maxItems.ingredients || rows.some(({ ingredientId }) => Number(ingredientId) === ingredient.id)) return rows
  return [...rows, {
    id: rowId, ingredientId: String(ingredient.id), name: ingredient.nombre,
    quantity: '', unit: 'G', order: nextOrder(rows), note: '',
  }]
}
