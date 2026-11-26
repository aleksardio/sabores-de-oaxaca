import assert from 'node:assert/strict'
import { test } from 'node:test'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { getRecipes } from '../src/services/recipesService.js'
import { creditSegments, parsePhotoCredit, splitRecipeDescription } from '../src/utils/recipeDescription.js'

const photoCredit = '«OllasChalmaEdoMex», Thelmadatter, Wikimedia Commons. CC BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/. Fuente: https://commons.wikimedia.org/wiki/File:OllasChalmaEdoMex.JPG — recortada y recodificada sin metadatos.'

test('separa los créditos sin confundirlos con menciones culinarias ni ocultar una atribución no estándar', () => {
  const text = 'Primera línea: foto del recetario, si se desea.\nSegunda línea.'
  assert.deepEqual(splitRecipeDescription(`${text}\r\n\r\nFoto: ${photoCredit}\r\nFoto: Fotografía propia`),
    { text, excerpt: 'Primera línea: foto del recetario, si se desea. Segunda línea.', credits: [photoCredit, 'Fotografía propia'] })
  assert.deepEqual(splitRecipeDescription(null), { text: '', excerpt: '', credits: [] })
  assert.deepEqual(parsePhotoCredit(photoCredit), {
    title: 'OllasChalmaEdoMex', author: 'Thelmadatter', collection: 'Wikimedia Commons', license: 'CC BY-SA 3.0',
    terms: 'https://creativecommons.org/licenses/by-sa/3.0/', source: 'https://commons.wikimedia.org/wiki/File:OllasChalmaEdoMex.JPG',
    changes: 'recortada y recodificada sin metadatos.',
  })
  assert.deepEqual(creditSegments('Autora: Ana. https://example.test/foto.'), [
    { text: 'Autora: Ana. ' }, { href: 'https://example.test/foto', text: 'Consultar referencia' }, { text: '.' },
  ])
  assert.equal(parsePhotoCredit(photoCredit.replace('https://commons.wikimedia.org', 'javascript:alert(1)')), null)
  assert.deepEqual(creditSegments('Ana: https://usuario@example.test/foto'), [{ text: 'Ana: https://usuario@example.test/foto' }])
})

test('la tarjeta pública enlaza por ID y no muestra región o duración de demostración', async (t) => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false } })
  t.after(() => vite.close())
  const { default: RecipeCard } = await vite.ssrLoadModule('/src/components/RecipeCard.jsx')
  const { default: PhotoCredits } = await vite.ssrLoadModule('/src/components/PhotoCredits.jsx')
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    contenido: [{
      id: 42, titulo: 'Mole', descripcion: `Preparación https://example.test/nota\n\nFoto: ${photoCredit}`, tipo: 'COMUN',
      porcionesBase: 4, autor: { id: 1, nombreVisible: 'Autora' }, categorias: [{ id: 7, nombre: 'Moles' }],
      region: 'Mixteca', time: '35 min', durationMinutes: 35,
    }],
    pagina: 0, tamano: 6, totalElementos: 1, totalPaginas: 1,
  }))
  const { contenido: [recipe] } = await getRecipes()
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RecipeCard, { recipe })))
  assert.match(html, /href="\/recetas\/42"/)
  for (const expected of ['Mole', 'Preparación', 'Receta común', 'Por Autora', 'Moles']) assert.ok(html.includes(expected))
  assert.doesNotMatch(html, /Mixteca|35 min|Tiempo total|Receta de demostración|Thelmadatter|CC BY-SA|https:\/\//)
  const attribution = renderToStaticMarkup(createElement(PhotoCredits, { credits: [photoCredit, 'Fotografía propia'] }))
  assert.match(attribution, /<figcaption/)
  assert.match(attribution, /<cite>OllasChalmaEdoMex<\/cite>/)
  for (const value of ['Thelmadatter', 'Fuente de la imagen', 'Licencia CC BY-SA 3.0', 'recortada y recodificada', 'Fotografía propia']) {
    assert.ok(attribution.includes(value))
  }
  assert.doesNotMatch(attribution, />https:\/\//)
})
