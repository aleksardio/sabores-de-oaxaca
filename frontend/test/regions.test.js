import assert from 'node:assert/strict'
import { test } from 'node:test'
import { regions } from '../src/data/regions.js'
import { readCatalogFilters } from '../src/services/recipesService.js'

test('la guía editorial conserva las ocho regiones con su descripción', () => {
  assert.deepEqual(regions.map(({ name }) => name), [
    'Cañada', 'Costa', 'Istmo', 'Mixteca', 'Papaloapan', 'Sierra Norte', 'Sierra Sur', 'Valles Centrales',
  ])
  assert.ok(regions.every(({ motif, description }) => motif && description.trim()))
})

test('los enlaces regionales antiguos no modifican los filtros de API', () => {
  const params = new URLSearchParams({ region: 'Valles Centrales', tipo: 'COMUN' })
  assert.deepEqual(readCatalogFilters(params), readCatalogFilters(new URLSearchParams('tipo=COMUN')))
})
