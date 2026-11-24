import assert from 'node:assert/strict'
import test from 'node:test'
import { blankDraft, changeIngredientUnit, validateRecipeDraft, validateRecipeForReview } from '../src/utils/recipeEditorValidation.js'

const ingredient = { id: 'row', ingredientId: '21', quantity: '0.125', unit: 'KG', note: '', order: '1' }
const media = { id: 'row', type: 'IMAGEN', url: 'https://ejemplo.invalid/img.jpg', alt: '', order: '1' }
const draft = {
  ...blankDraft, title: 'Salsa', description: 'Casera', preparation: 'Mezclar.', type: 'COMUN', baseServings: '2',
}
const record = { estado: 'BORRADOR', eliminadoEn: null }
const check = (fields) => validateRecipeDraft({ ...draft, ...fields })

test('guarda borrador con arreglos vacíos pero exige categoría, ingrediente y estado activo para revisión', () => {
  assert.deepEqual(check({}), {})
  assert.deepEqual(Object.keys(validateRecipeForReview(draft, record)).sort(), ['categories', 'ingredients'])
  const complete = { ...draft, categories: [{ id: 14 }], ingredients: [ingredient] }
  assert.deepEqual(validateRecipeForReview(complete, record), {})
  assert.deepEqual(validateRecipeForReview(complete, { ...record, estado: 'RECHAZADA' }), {})
  assert.ok(validateRecipeForReview(complete, { ...record, eliminadoEn: '2026-11-23' }).state)
  for (const key of ['categories', 'ingredients', 'multimedia']) assert.ok(check({ [key]: undefined })[key])
})

test('valida campos requeridos, tipo, título y porciones hasta Integer.MAX_VALUE', () => {
  assert.deepEqual(Object.keys(check({ title: ' ', description: '', preparation: ' ', type: 'MOLE' })), ['title', 'description', 'preparation', 'type'])
  assert.ok(check({ title: 'a'.repeat(201) }).title)
  assert.deepEqual(check({ title: 'a'.repeat(200), baseServings: '2147483647', type: 'TRADICIONAL_OAXAQUENA' }), {})
  for (const value of ['', '0', '-1', '1.5', '1e2', '2147483648']) assert.ok(check({ baseServings: value }).baseServings)
})

test('valida precisión de cantidades, unidad, nota y transición a Al gusto', () => {
  const row = (fields) => check({ ingredients: [{ ...ingredient, ...fields }] })
  for (const quantity of ['', '0', '0.000', '-1', 'NaN', '1e3', '1.0001', '1000000000', '1,2.3']) {
    assert.ok(row({ quantity })['ingredient-row-quantity'], quantity)
  }
  for (const quantity of ['1', '0,001', '999999999.999']) assert.deepEqual(row({ quantity }), {})
  assert.ok(row({ unit: 'PIZCA' })['ingredient-row-unit'])
  assert.ok(row({ unit: 'AL_GUSTO', quantity: '' })['ingredient-row-unit'])
  assert.ok(row({ note: 'a'.repeat(256) })['ingredient-row-note'])
  const toTaste = changeIngredientUnit(ingredient, 'AL_GUSTO')
  assert.equal(toTaste.quantity, null)
  assert.deepEqual(row(toTaste), {})
  assert.equal(changeIngredientUnit(toTaste, 'G').quantity, '')
})

test('valida referencias positivas, duplicados, órdenes y límites de las colecciones', () => {
  assert.ok(check({ categories: [{ id: 2 }, { id: '02' }] }).categories)
  assert.ok(check({ categories: [{ id: 0 }] }).categories)
  assert.ok(check({ categories: Array.from({ length: 101 }, (_, i) => ({ id: i + 1 })) }).categories)
  const errors = check({ ingredients: [ingredient, { ...ingredient, id: 'dup', ingredientId: '021' }],
    multimedia: [media, { ...media, id: 'dup' }] })
  for (const key of ['ingredient-dup-ingredientId', 'ingredient-dup-order', 'media-dup-order']) assert.match(errors[key], /repetido/)
  assert.ok(check({ ingredients: [{ ...ingredient, ingredientId: '' }] })['ingredient-row-ingredientId'])
  assert.ok(check({ ingredients: Array(501).fill(ingredient) }).ingredients)
  assert.ok(check({ multimedia: Array(101).fill(media) }).multimedia)
  assert.ok(check({ multimedia: [{ ...media, order: '2147483648' }] })['media-row-order'])
})

test('multimedia solo admite Imagen o Video con URL HTTPS válida y texto alternativo acotado', () => {
  const item = (fields) => check({ multimedia: [{ ...media, ...fields }] })
  for (const url of ['http://ejemplo.invalid', 'javascript:alert(1)', 'https:///fake.com', 'https://a@fake.com',
    'https://bad_host.invalid', 'https://fake.com/%xx', 'https://fake.com/not an image', `https://fake.com/${'a'.repeat(2048)}`]) {
    assert.ok(item({ url })['media-row-url'], url)
  }
  assert.deepEqual(item({ type: 'VIDEO', url: 'https://ejemplo.invalid:443/video?q=uno%20dos' }), {})
  assert.ok(item({ type: 'AUDIO' })['media-row-type'])
  assert.ok(item({ alt: 'a'.repeat(256) })['media-row-alt'])
})
