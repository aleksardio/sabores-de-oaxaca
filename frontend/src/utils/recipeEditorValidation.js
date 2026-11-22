import { demoRecipeCategories, ingredientUnits, recipeTypes } from '../data/recipeEditorOptions.js'

export function normalizeRecipeText(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function changeIngredientUnit(ingredient, unit) {
  return { ...ingredient, unit, quantity: unit === 'AL_GUSTO' ? null : ingredient.quantity ?? '' }
}

function isPositiveDecimal(quantity) {
  return typeof quantity === 'string'
    && /^\d{1,9}(?:[.,]\d{1,3})?$/.test(quantity)
    && /[1-9]/.test(quantity)
}

// The editor keeps raw text (including incomplete values). These checks are
// only for readiness; they do not modify the draft or prepare a server request.
export function validateRecipeForReview(recipe) {
  const errors = {}
  if (!recipe.title.trim()) errors.title = 'Escribe el título de la receta.'
  else if (recipe.title.length > 200) errors.title = 'El título debe tener como máximo 200 caracteres.'
  if (!recipe.description.trim()) errors.description = 'Escribe una descripción.'
  if (!Object.hasOwn(recipeTypes, recipe.type)) errors.type = 'Selecciona un tipo de receta.'
  if (!/^\d+$/.test(recipe.baseServings) || Number(recipe.baseServings) < 1 || Number(recipe.baseServings) > 4294967295) {
    errors.baseServings = 'Escribe un entero entre 1 y 4 294 967 295.'
  }
  if (!recipe.categories.length || !recipe.categories.every((category) => demoRecipeCategories.includes(category))) {
    errors.categories = 'Selecciona al menos una categoría de la lista.'
  }
  if (!recipe.ingredients.length) errors.ingredients = 'Agrega al menos un ingrediente.'

  const names = new Set()
  recipe.ingredients.forEach((ingredient) => {
    const { id, name, unit, quantity, note } = ingredient
    const normalized = normalizeRecipeText(name)
    if (!normalized) errors[`ingredient-${id}-name`] = 'Escribe el nombre del ingrediente.'
    else if (name.length > 150) errors[`ingredient-${id}-name`] = 'El nombre debe tener como máximo 150 caracteres.'
    else if (names.has(normalized)) errors[`ingredient-${id}-name`] = 'Este ingrediente ya está en la receta.'
    if (normalized) names.add(normalized)

    if (!Object.hasOwn(ingredientUnits, unit)) errors[`ingredient-${id}-unit`] = 'Selecciona una unidad válida.'
    else if (unit === 'AL_GUSTO' && quantity !== null) errors[`ingredient-${id}-unit`] = '«Al gusto» requiere una cantidad vacía.'
    else if (unit !== 'AL_GUSTO' && !isPositiveDecimal(quantity)) {
      errors[`ingredient-${id}-quantity`] = 'Escribe una cantidad mayor que cero, con hasta 9 dígitos enteros y 3 decimales.'
    }
    if (note.length > 255) errors[`ingredient-${id}-note`] = 'La nota debe tener como máximo 255 caracteres.'
  })

  if (!recipe.preparation.trim()) errors.preparation = 'Escribe la preparación.'
  return errors
}
