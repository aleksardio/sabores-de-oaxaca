import assert from 'node:assert/strict'
import { test } from 'node:test'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { getRecipes } from '../src/services/recipesService.js'

test('la tarjeta pública enlaza por ID y no muestra región o duración de demostración', async (t) => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false } })
  t.after(() => vite.close())
  const { default: RecipeCard } = await vite.ssrLoadModule('/src/components/RecipeCard.jsx')
  t.mock.method(globalThis, 'fetch', async () => Response.json({
    contenido: [{
      id: 42, titulo: 'Mole', descripcion: 'Preparación', tipo: 'COMUN',
      porcionesBase: 4, autor: { id: 1, nombreVisible: 'Autora' }, categorias: [{ id: 7, nombre: 'Moles' }],
      region: 'Mixteca', time: '35 min', durationMinutes: 35,
    }],
    pagina: 0, tamano: 6, totalElementos: 1, totalPaginas: 1,
  }))
  const { contenido: [recipe] } = await getRecipes()
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(RecipeCard, { recipe })))
  assert.match(html, /href="\/recetas\/42"/)
  for (const expected of ['Mole', 'Preparación', 'Receta común', 'Por Autora', 'Moles']) assert.ok(html.includes(expected))
  assert.doesNotMatch(html, /Mixteca|35 min|Tiempo total|Receta de demostración/)
})
