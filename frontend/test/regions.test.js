import assert from 'node:assert/strict'
import { test } from 'node:test'
import { recipes } from '../src/data/recipes.js'
import { getCatalogRegion, regions } from '../src/data/regions.js'

test('las ocho regiones usan los nombres del catálogo y Cañada no tiene recetas locales', () => {
  const names = regions.map(({ name }) => name)
  assert.deepEqual(names, [
    'Cañada', 'Costa', 'Istmo', 'Mixteca', 'Papaloapan', 'Sierra Norte', 'Sierra Sur', 'Valles Centrales',
  ])
  assert.deepEqual(new Set(recipes.map(({ region }) => region)), new Set(names.slice(1)))
})

test('el parámetro regional conserva espacios y acentos al compartir el enlace', () => {
  for (const { name } of regions) {
    const query = new URLSearchParams({ region: name }).toString()
    assert.equal(getCatalogRegion(new URLSearchParams(query).get('region')), name)
  }
})

test('una región desconocida, vacía o ausente no limita el catálogo', () => {
  for (const value of ['Región desconocida', 'mixteca', '', null]) {
    assert.equal(getCatalogRegion(value), '')
  }
})
