import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getCategories, getRecipeById, getRecipes, parseRecipeId, readCatalogFilters } from '../src/services/recipesService.js'
import { ingredientRows, recipeImage } from '../src/utils/publicRecipePresentation.js'

const categories = [{ id: 7, nombre: 'Moles', descripcion: null }, { id: 8, nombre: 'Salsas', descripcion: 'De la milpa' }]
const recipe = {
  id: 42, titulo: 'Mole', descripcion: 'Preparación', tipo: 'TRADICIONAL_OAXAQUENA', porcionesBase: 6,
  autor: { id: 1, nombreVisible: 'Autora', avatarUrl: null }, categorias: categories,
}
const detail = {
  ...recipe, preparacion: 'Mezclar\nServir', porcionesSolicitadas: null, multimedia: [],
  ingredientes: [
    { id: 9, nombre: 'Sal', unidad: 'AL_GUSTO', orden: 3, cantidadBase: null, cantidadAjustada: null },
    { id: 10, nombre: 'Chile', unidad: 'G', orden: 1, cantidadBase: 2, cantidadAjustada: null },
    { id: 11, nombre: 'Especia', unidad: 'G', orden: 2, cantidadBase: 0.001, cantidadAjustada: null },
  ],
}
const page = (fields) => ({
  contenido: [recipe], pagina: 0, tamano: 6, totalElementos: 1, totalPaginas: 1, ...fields,
})
const adjusted = (servings) => ({
  ...detail, porcionesSolicitadas: servings,
  ingredientes: detail.ingredientes.map((row, index) => ({ ...row, cantidadAjustada: [null, 0.667, 0][index] })),
})

function mockFetch(t, ...replies) {
  return t.mock.method(globalThis, 'fetch', async (...args) => {
    assert.ok(replies.length, 'Solicitud inesperada')
    const reply = replies.shift()
    return typeof reply === 'function' ? reply(...args) : reply
  })
}

function urlAt(fetch, index = 0) {
  return new URL(fetch.mock.calls[index].arguments[0], 'http://localhost')
}

test('catálogo 200 devuelve las recetas del servidor con sus categorías', async (t) => {
  const fetch = mockFetch(t, Response.json(page()))
  assert.deepEqual(await getRecipes(), page())
  assert.equal(urlAt(fetch).pathname, '/api/v1/recetas')
})

test('catálogo vacío y tamaño de la portada', async (t) => {
  const empty = page({ contenido: [], tamano: 3, totalElementos: 0, totalPaginas: 0 })
  const fetch = mockFetch(t, Response.json(empty))
  assert.deepEqual(await getRecipes({ tamano: 3 }), empty)
  assert.equal(urlAt(fetch).searchParams.get('tamano'), '3')
})

test('título, categoría y tipo se serializan sin enviar región ni duplicar la base', async (t) => {
  const fetch = mockFetch(t, Response.json(page()))
  const filters = readCatalogFilters(new URLSearchParams({
    titulo: '  Mole 100% &_!  ', categoria: '008', tipo: 'TRADICIONAL_OAXAQUENA', region: 'Mixteca',
  }))
  await getRecipes(filters)
  assert.deepEqual(Object.fromEntries(urlAt(fetch).searchParams), {
    titulo: 'Mole 100% &_!', categoria: '8', tipo: 'TRADICIONAL_OAXAQUENA', pagina: '0', tamano: '6',
  })
})

test('paginación desde cero conserva el total y el contenido de esa página', async (t) => {
  const thirdPage = page({ pagina: 2, totalElementos: 13, totalPaginas: 3 })
  const fetch = mockFetch(t, Response.json(thirdPage))
  assert.deepEqual(await getRecipes(readCatalogFilters(new URLSearchParams('pagina=2'))), thirdPage)
  assert.equal(urlAt(fetch).search, '?pagina=2&tamano=6')
})

test('URLs inválidas no envían filtros fuera del contrato', () => {
  const result = readCatalogFilters(new URLSearchParams(`titulo=${'x'.repeat(250)}&categoria=-1&tipo=VIDEO&pagina=9999999999`))
  assert.deepEqual(result, { titulo: 'x'.repeat(200), categoria: null, tipo: '', pagina: 0 })
})

test('categorías 200 acepta descripciones nulas y categorías vacías', async (t) => {
  const fetch = mockFetch(t, Response.json(categories), Response.json([]))
  assert.deepEqual(await getCategories(), categories)
  assert.deepEqual(await getCategories(), [])
  assert.equal(urlAt(fetch).pathname, '/api/v1/categorias')
})

test('detalle 200 usa ID numérico, admite multimedia vacía y solicita la base sin query', async (t) => {
  const fetch = mockFetch(t, Response.json(detail))
  assert.deepEqual(await getRecipeById(parseRecipeId('042')), detail)
  assert.equal(urlAt(fetch).pathname + urlAt(fetch).search, '/api/v1/recetas/42')
  assert.equal(recipeImage(detail.multimedia), null)
  assert.deepEqual(ingredientRows(detail.ingredientes, false).map(({ amount }) => amount), ['2 g', '0,001 g', 'Al gusto'])
})

test('detalle tolera preparación ausente y ningún ingrediente', async (t) => {
  mockFetch(t, Response.json({ ...detail, preparacion: undefined, ingredientes: [] }))
  const result = await getRecipeById(42)
  assert.equal(result.preparacion, undefined)
  assert.deepEqual(ingredientRows(result.ingredientes, false), [])
})

test('detalle 404 no usa mensajes internos del servidor', async (t) => {
  mockFetch(t, Response.json({ error: 'detalle interno' }, { status: 404 }))
  await assert.rejects(getRecipeById(42), (error) => error.status === 404 && !error.message.includes('interno'))
})

test('porciones=2 muestra los tres decimales, el cero aproximado y AL_GUSTO sin recalcular', async (t) => {
  const fetch = mockFetch(t, Response.json(adjusted(2)))
  const result = await getRecipeById(42, 2)
  assert.equal(urlAt(fetch).search, '?porciones=2')
  assert.deepEqual(ingredientRows(result.ingredientes, true).map(({ amount }) => amount), ['0,667 g', '≈ 0 g', 'Al gusto'])
})

test('acepta 1 y 100, descarta porciones inválidas e IDs ficticios antes de fetch', async (t) => {
  const fetch = mockFetch(t, Response.json(adjusted(1)), Response.json(adjusted(100)))
  for (const value of [0, 101, 1.5, '2', null, Infinity]) {
    await assert.rejects(getRecipeById(42, value), RangeError)
  }
  for (const value of ['tlayuda', '0', '-2', '1.5', '1e2', '9007199254740992']) {
    assert.equal(parseRecipeId(value), null)
    await assert.rejects(getRecipeById(value), RangeError)
  }
  await getRecipeById(42, 1)
  await getRecipeById(42, 100)
  assert.equal(fetch.mock.callCount(), 2)
  assert.deepEqual([urlAt(fetch).search, urlAt(fetch, 1).search], ['?porciones=1', '?porciones=100'])
})

test('400, 5xx, fallo de red, JSON inválido y estructura inesperada', async (t) => {
  mockFetch(t, Response.json({ error: 'Parámetros inválidos' }, { status: 400 }),
    new Response(null, { status: 500 }), () => { throw new TypeError('Fallo de red') },
    new Response('<html>'), Response.json({ contenido: [null], pagina: 0, tamano: 6 }))
  await assert.rejects(getRecipes(), { status: 400, message: /Parámetros inválidos/ })
  await assert.rejects(getCategories(), { status: 500 })
  await assert.rejects(getRecipeById(42), { status: 0 })
  await assert.rejects(getCategories(), { status: 200, message: /respuesta inesperada/ })
  await assert.rejects(getRecipes(), { status: 200, message: /respuesta inesperada/ })
})

test('aborta solicitudes aunque fetch entregue una respuesta tardía', async (t) => {
  const controller = new AbortController()
  const reply = Promise.withResolvers()
  const fetch = mockFetch(t, () => reply.promise, Response.json(adjusted(6)))
  const first = getRecipeById(42, 2, controller.signal)
  const rejection = assert.rejects(first, { name: 'AbortError' })
  assert.equal(fetch.mock.calls[0].arguments[1].signal, controller.signal)
  controller.abort()
  assert.equal((await getRecipeById(42, 6)).porcionesSolicitadas, 6)
  reply.resolve(Response.json(adjusted(2)))
  await rejection
  await assert.rejects(getCategories(controller.signal), { name: 'AbortError' })
  assert.equal(fetch.mock.callCount(), 2)
})

test('las cuatro solicitudes son GET sin Bearer ni cookies', async (t) => {
  const fetch = mockFetch(t, Response.json(page()), Response.json(categories), Response.json(detail), Response.json(adjusted(2)))
  await getRecipes()
  await getCategories()
  await getRecipeById(42)
  await getRecipeById(42, 2)
  for (const { arguments: [, init] } of fetch.mock.calls) {
    assert.deepEqual(init.headers, { Accept: 'application/json' })
    assert.equal(init.method, 'GET')
    assert.equal(init.credentials, 'omit')
  }
})

test('multimedia omite videos, URLs ficticias, vacías o inseguras', () => {
  const items = [
    { orden: 1, tipo: 'VIDEO', url: 'https://videos.example.com/video' },
    { orden: 2, tipo: 'IMAGEN', url: 'https://example.invalid/foto' },
    { orden: 3, tipo: 'IMAGEN', url: null },
    { orden: 4, tipo: 'IMAGEN', url: 'javascript:void(0)' },
  ]
  assert.equal(recipeImage(items), null)
  assert.deepEqual(recipeImage([{ orden: 5, tipo: 'IMAGEN', url: 'https://images.example.com/foto', textoAlternativo: 'Mole' }, ...items]), {
    src: 'https://images.example.com/foto', alt: 'Mole',
  })
})
