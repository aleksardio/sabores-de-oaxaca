import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { marketPhoto, regions } from '../src/data/regions.js'
import { readCatalogFilters } from '../src/services/recipesService.js'

test('la guía editorial conserva las ocho regiones con su descripción', () => {
  assert.deepEqual(regions.map(({ name }) => name), [
    'Cañada', 'Costa', 'Istmo', 'Mixteca', 'Papaloapan', 'Sierra Norte', 'Sierra Sur', 'Valles Centrales',
  ])
  assert.ok(regions.every(({ description }) => description.trim()))
  const photos = [marketPhoto, ...regions.map(({ photo }) => photo)]
  assert.equal(new Set(photos.map(({ src }) => src)).size, photos.length)
  for (const { src, place, alt, author, source, terms } of photos) {
    assert.match(src, /^\/tradiciones\/[a-z-]+\.webp$/)
    const bytes = readFileSync(new URL(`../public${src}`, import.meta.url))
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
    assert.ok(place.trim() && alt.trim() && author.trim())
    assert.match(source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/)
    assert.match(terms, /^https:\/\/creativecommons\.org\/licenses\/by(?:-sa)?\/\d\.\d\/$/)
  }
})

test('los enlaces regionales antiguos no modifican los filtros de API', () => {
  const params = new URLSearchParams({ region: 'Valles Centrales', tipo: 'COMUN' })
  assert.deepEqual(readCatalogFilters(params), readCatalogFilters(new URLSearchParams('tipo=COMUN')))
})
