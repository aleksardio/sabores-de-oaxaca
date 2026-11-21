import assert from 'node:assert/strict'
import { test } from 'node:test'
import { recipes } from '../src/data/recipes.js'
import { scaleIngredients } from '../src/utils/servings.js'

const grams = (quantity) => [{ name: 'Ingrediente', quantity, unit: 'G', order: 1 }]
const amounts = (ingredients, base, servings) =>
  scaleIngredients(ingredients, base, servings).map(({ quantity }) => quantity)

test('200 g para cuatro rinde 100 g para dos y 300 g para seis', () => {
  const ingredients = grams('200')
  assert.deepEqual(amounts(ingredients, 4, 2), ['100'])
  assert.deepEqual(amounts(ingredients, 4, 6), ['300'])
})

test('conserva AL_GUSTO, unidad, orden y nota sin alterar el original', () => {
  const salt = Object.freeze({ name: 'Sal', quantity: null, unit: 'AL_GUSTO', order: 2, note: 'Al servir' })
  const onion = Object.freeze({ name: 'Cebolla', quantity: '1', unit: 'PIEZA', order: 1 })
  const input = Object.freeze([salt, onion])
  assert.deepEqual(scaleIngredients(input, 4, 2), [
    { ...onion, quantity: '0.5', isApproximateZero: false },
    { ...salt, isApproximateZero: false },
  ])
  assert.deepEqual(input, [salt, onion])
})

test('redondea solo al final con HALF_UP, incluso en empates y acarreos', () => {
  assert.deepEqual(amounts(grams('1'), 6, 4), ['0.667'])
  assert.deepEqual(amounts(grams('1.005'), 4, 2), ['0.503'])
  assert.deepEqual(amounts(grams('1.999'), 4, 2), ['1'])
  assert.deepEqual(amounts(grams('0.007'), 6, 2), ['0.002'])
  assert.deepEqual(amounts(grams('999999999.999'), 1, 6), ['5999999999.994'])
})

test('distingue cero aproximado del empate mínimo positivo', () => {
  const [small] = scaleIngredients(grams('0.001'), 6, 2)
  const [tie] = scaleIngredients(grams('0.001'), 4, 2)
  assert.equal(small.quantity, '0')
  assert.equal(small.isApproximateZero, true)
  assert.equal(tie.quantity, '0.001')
  assert.equal(tie.isApproximateZero, false)
})

test('valida porciones, unidad y cantidad', () => {
  for (const invalid of [0, -1, 2.5, '4', Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => scaleIngredients(grams('1'), invalid, 4), RangeError)
    assert.throws(() => scaleIngredients(grams('1'), 4, invalid), RangeError)
  }
  for (const invalid of ['0', '-1', '0.0005', null, '1000000000', [1]]) {
    assert.throws(() => scaleIngredients(grams(invalid), 4, 2), RangeError)
  }
  assert.throws(() => scaleIngredients([{ unit: 'ONZA', quantity: '1' }], 4, 2), RangeError)
  assert.throws(() => scaleIngredients([{ unit: 'AL_GUSTO', quantity: '1' }], 4, 2), TypeError)
})

test('mole negro reproduce los frames y recupera sus cantidades base', () => {
  const { baseServings, ingredientDetails } = recipes.find(({ id }) => id === 'mole-negro')
  assert.equal(baseServings, 4)
  assert.deepEqual(ingredientDetails.map(({ name }) => name), ['Pollo', 'Chiles secos', 'Chocolate', 'Tortillas', 'Semillas'])
  assert.deepEqual(
    [4, 2, 6, 4].map((servings) => amounts(ingredientDetails, baseServings, servings)),
    [
      ['300', '100', '50', '2', '30'],
      ['150', '50', '25', '1', '15'],
      ['450', '150', '75', '3', '45'],
      ['300', '100', '50', '2', '30'],
    ],
  )
})

test('las catorce recetas tienen detalle completo y cantidades válidas', () => {
  assert.equal(recipes.length, 14)
  assert.equal(new Set(recipes.map(({ id }) => id)).size, 14)
  const units = new Set()
  for (const recipe of recipes) {
    assert.ok(recipe.ingredients.length > 0 && recipe.ingredients.every((name) => typeof name === 'string'))
    assert.ok(recipe.preparation.split('\n').every((line) => line.trim()))
    assert.ok(recipe.ingredientDetails.length > 0)
    const orders = recipe.ingredientDetails.map(({ order }) => order)
    assert.ok(orders.every((order) => Number.isInteger(order) && order > 0))
    assert.equal(new Set(orders).size, orders.length)
    for (const ingredient of recipe.ingredientDetails) {
      assert.ok(ingredient.name.trim())
      units.add(ingredient.unit)
    }
    for (const servings of [recipe.baseServings, 2, 4, 6]) {
      assert.equal(scaleIngredients(recipe.ingredientDetails, recipe.baseServings, servings).length, orders.length)
    }
  }
  assert.deepEqual(units, new Set(['G', 'KG', 'ML', 'L', 'PIEZA', 'CUCHARADA', 'CUCHARADITA', 'TAZA', 'AL_GUSTO']))
})
