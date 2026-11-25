import assert from 'node:assert/strict'
import test from 'node:test'
import { getAdminCatalogs } from '../src/services/adminCatalogsService.js'

test('carga categorías e ingredientes reales con sus campos', async (t) => {
  const categories = [{ id: 4, nombre: 'Moles', descripcion: 'Preparaciones de mole' }]
  const ingredients = [{ id: 8, nombre: 'Maíz' }]
  const fetch = t.mock.method(globalThis, 'fetch', async (url) => {
    if (url === '/api/v1/categorias') return Response.json(categories)
    if (url === '/api/v1/ingredientes') return Response.json(ingredients)
    throw new Error('Ruta inesperada')
  })
  assert.deepEqual(await getAdminCatalogs(), { categories, ingredients })
  assert.equal(fetch.mock.callCount(), 2)
})

test('si falla un catálogo se rechaza la carga sin datos alternativos', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => url.endsWith('/categorias')
    ? Response.json([{ id: 4, nombre: 'Moles', descripcion: null }])
    : new Response('', { status: 503 }))
  await assert.rejects(getAdminCatalogs(), { status: 503 })
})
