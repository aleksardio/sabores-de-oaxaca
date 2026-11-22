import assert from 'node:assert/strict'
import test from 'node:test'
import { changeIngredientUnit, validateRecipeForReview } from '../src/utils/recipeEditorValidation.js'

const ingredient = { id: 1, name: 'Maíz  molido', quantity: '0.125', unit: 'KG', note: '' }
const completeRecipe = {
  title: 'Receta de prueba',
  description: 'Ejemplo de validación.',
  preparation: 'Mezclar los ingredientes.',
  type: 'COMUN',
  baseServings: '2',
  categories: ['Antojitos'],
  ingredients: [ingredient],
}

const check = (fields) => validateRecipeForReview({ ...completeRecipe, ...fields })
const checkIngredient = (fields) => check({ ingredients: [{ ...ingredient, ...fields }] })

test('comprueba el título vacío, de solo espacios y el límite de 200 caracteres', () => {
  for (const title of ['', '  ', 'a'.repeat(201)]) assert.ok(check({ title }).title)
  assert.deepEqual(check({ title: 'a'.repeat(200) }), {})
})

test('descripción, preparación y tipo son obligatorios para revisar', () => {
  const errors = check({ description: ' ', preparation: '', type: 'Antojitos' })
  assert.deepEqual(Object.keys(errors).sort(), ['description', 'preparation', 'type'])
  assert.deepEqual(check({ type: 'TRADICIONAL_OAXAQUENA' }), {})
})

test('acepta solo porciones enteras positivas que caben en INT UNSIGNED', () => {
  for (const baseServings of ['', '0', '-1', '1.5', '1e2', 'NaN', '4294967296']) {
    assert.ok(check({ baseServings }).baseServings, baseServings)
  }
  assert.deepEqual(check({ baseServings: '4294967295' }), {})
})

test('requiere ingredientes y que todas las filas estén completas', () => {
  assert.ok(check({ ingredients: [] }).ingredients)
  const errors = check({ ingredients: [ingredient, { id: 2, name: ' ', quantity: '', unit: 'G', note: '' }] })
  assert.ok(errors['ingredient-2-name'])
  assert.ok(errors['ingredient-2-quantity'])
  assert.ok(checkIngredient({ unit: 'PIZCA' })['ingredient-1-unit'])
  assert.ok(checkIngredient({ note: 'a'.repeat(256) })['ingredient-1-note'])
})

test('cantidad numérica positiva con precisión DECIMAL(12,3) sin conversiones flotantes', () => {
  for (const quantity of ['', '0', '0.000', '-1', 'NaN', '1e3', '1.0001', '1000000000', '1,2.3']) {
    assert.ok(checkIngredient({ quantity })['ingredient-1-quantity'], quantity)
  }
  for (const quantity of ['1', '0,001', '999999999.999']) {
    assert.deepEqual(checkIngredient({ quantity }), {})
  }
})

test('AL_GUSTO descarta la cantidad anterior, exige null y permite volver a una unidad numérica vacía', () => {
  const toTaste = changeIngredientUnit(ingredient, 'AL_GUSTO')
  assert.equal(toTaste.quantity, null)
  assert.equal(ingredient.quantity, '0.125')
  assert.deepEqual(check({ ingredients: [toTaste] }), {})
  assert.ok(checkIngredient({ unit: 'AL_GUSTO', quantity: '' })['ingredient-1-unit'])
  assert.ok(checkIngredient({ unit: 'AL_GUSTO', quantity: '1' })['ingredient-1-unit'])
  const numeric = changeIngredientUnit(toTaste, 'G')
  assert.equal(numeric.quantity, '')
  assert.ok(check({ ingredients: [numeric] })['ingredient-1-quantity'])
})

test('detecta duplicados aunque difieran los espacios, mayúsculas, acentos o unidades', () => {
  const errors = check({ ingredients: [ingredient, { ...ingredient, id: 2, name: '  MAIZ molido ', unit: 'G' }] })
  assert.match(errors['ingredient-2-name'], /ya está/)
})

test('requiere al menos una categoría de demostración, independiente del tipo', () => {
  assert.ok(check({ categories: [] }).categories)
  assert.ok(check({ categories: ['COMUN'] }).categories)
  assert.deepEqual(check({ categories: ['Antojitos', 'Dulces'] }), {})
})
