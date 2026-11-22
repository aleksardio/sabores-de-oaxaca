import assert from 'node:assert/strict'
import { test } from 'node:test'
import { demoAuthors, findDemoAuthor } from '../src/data/demoAuthors.js'

test('busca cada autor de demostración por su identificador único', () => {
  assert.ok(demoAuthors.length > 0)
  assert.equal(new Set(demoAuthors.map(({ id }) => id)).size, demoAuthors.length)
  for (const author of demoAuthors) {
    assert.equal(findDemoAuthor(author.id), author)
  }
})

test('no devuelve un perfil alternativo para identificadores desconocidos o vacíos', () => {
  for (const id of ['no-existe', 'EJEMPLO', '', undefined]) {
    assert.equal(findDemoAuthor(id), undefined)
  }
})
