import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import test from 'node:test'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { createRecipeCoverQueue } from '../src/services/recipeCovers.js'
import { addIngredient, searchIngredients } from '../src/utils/ingredientSelection.js'
import { recipeImage } from '../src/utils/publicRecipePresentation.js'
import { blankDraft, recipeReviewRequirements, toRecipeBody, validateRecipeDraft, validateRecipeForReview } from '../src/utils/recipeEditorValidation.js'
import { remoteVideoSource } from '../src/utils/recipeVideo.js'

const origin = 'https://media.saboresdeoaxaca.food'
const photo = { tipo: 'IMAGEN', orden: 4, url: `${origin}/mole.jpg`, textoAlternativo: ' Mole negro ' }

test('la portada usa la primera IMAGEN HTTPS válida por orden sin alterar el detalle', () => {
  const items = [
    { ...photo, orden: 7, url: `${origin}/otra.webp` },
    { ...photo, orden: 1, url: `https://usuario@${new URL(origin).host}/foto.jpg` },
    { ...photo, orden: 2, tipo: 'VIDEO' },
    photo,
    { ...photo, orden: 3, url: 'https://foto.invalid./mole.jpg' },
    { ...photo, orden: 2, url: 'https://example.org/foto invalida.jpg' },
  ]
  assert.deepEqual(recipeImage(items), { src: photo.url, alt: 'Mole negro' })
  assert.equal(items[0].orden, 7)
  assert.equal(recipeImage(items.filter(({ orden }) => orden < 4)), null)
  assert.equal(recipeImage([]), null)
})

test('la cola limita detalles a tres, evita duplicados y sigue tras un error o la ausencia de imagen', async () => {
  const calls = []
  const covers = []
  const queue = createRecipeCoverQueue((...cover) => covers.push(cover),
    (id, servings, signal) => new Promise((resolve, reject) => calls.push({ id, servings, signal, resolve, reject })))
  queue.show([1, 1, 2, 3, 4, 5])
  await setImmediate()
  assert.deepEqual(calls.map(({ id }) => id), [1, 2, 3])
  assert.ok(calls.every(({ servings, signal }) => servings === undefined && !signal.aborted))
  calls[1].reject(new Error('No hay detalle'))
  await setImmediate()
  assert.deepEqual(calls.map(({ id }) => id), [1, 2, 3, 4])
  calls[3].resolve({ multimedia: [] })
  await setImmediate()
  assert.deepEqual(calls.map(({ id }) => id), [1, 2, 3, 4, 5])
  queue.show([2, 4, 5, 5])
  calls[0].resolve({ multimedia: [photo] })
  await setImmediate()
  assert.deepEqual(covers, [[4, null], [1, { src: photo.url, alt: 'Mole negro' }]])
  assert.equal(calls.length, 5)
  queue.cancel()
})

test('cancelar el listado aborta los detalles en curso y descarta trabajos y resultados obsoletos', async () => {
  const calls = []
  const covers = []
  const queue = createRecipeCoverQueue((...cover) => covers.push(cover),
    (id, _, signal) => new Promise((resolve) => calls.push({ id, signal, resolve })))
  queue.show([1, 2, 3, 4])
  await setImmediate()
  queue.cancel()
  for (const call of calls) {
    assert.equal(call.signal.aborted, true)
    call.resolve({ multimedia: [photo] })
  }
  await setImmediate()
  assert.deepEqual(calls.map(({ id }) => id), [1, 2, 3])
  assert.deepEqual(covers, [])
})

test('la búsqueda agrega por nombre sin acentos ni mayúsculas y evita duplicados sobre las filas actuales', () => {
  const rows = [{ id: 28, ingredientId: '28', name: 'Chile', unit: 'G', quantity: '2,5', order: '3', note: 'Molido' }]
  const catalog = [{ id: 54, nombre: 'Sal' }, { id: 91, nombre: 'Maíz' }]
  const [result] = searchIngredients(catalog, '  MAIZ ')
  const updated = addIngredient(rows, result, 'new-0')
  assert.equal(updated[0], rows[0])
  assert.deepEqual(updated[1], { id: 'new-0', ingredientId: '91', name: 'Maíz', unit: 'G', quantity: '', order: '4', note: '' })
  assert.equal(addIngredient(updated, result, 'new-1'), updated)
  assert.deepEqual(toRecipeBody({ ...blankDraft, ingredients: [rows[0], { ...updated[1], quantity: '3' }] }).ingredientes, [
    { ingredienteId: 28, cantidad: 2.5, unidad: 'G', orden: 3, nota: 'Molido' },
    { ingredienteId: 91, cantidad: 3, unidad: 'G', orden: 4, nota: null },
  ])
})

const validDraft = { ...blankDraft, title: 'Mole', description: 'Casero', preparation: 'Moler', type: 'COMUN', baseServings: '2' }
const reviewable = { estado: 'RECHAZADA', eliminadoEn: null }

test('porciones base y cantidades conservan el texto y rechazan formatos inválidos', () => {
  for (const baseServings of ['dos', '1e2', '2.0', ' 2 ', '0', '-2', '2147483648']) {
    assert.match(validateRecipeDraft({ ...validDraft, baseServings }).baseServings, /entero positivo válido/)
  }
  const [row] = addIngredient([], { id: 1, nombre: 'Maíz' }, 'one')
  for (const quantity of ['', '0', '1e2', 'texto', '1.2345']) {
    assert.match(validateRecipeDraft({ ...validDraft, ingredients: [{ ...row, quantity }] })['ingredient-one-quantity'], /cantidad positiva/)
  }
  assert.deepEqual(validateRecipeDraft({ ...validDraft, ingredients: [{ ...row, quantity: '1,234' }] }), {})
})

test('faltan ingredientes y categorías para revisar, pero no para un borrador válido', () => {
  assert.deepEqual(validateRecipeDraft(validDraft), {})
  const requirements = recipeReviewRequirements(validDraft, reviewable)
  assert.deepEqual(Object.keys(requirements), ['categories', 'ingredients'])
  assert.deepEqual(validateRecipeForReview(validDraft, reviewable), requirements)
  assert.ok(recipeReviewRequirements(validDraft, { ...reviewable, estado: 'PUBLICADA' }).state)
})

test('el reproductor verifica HTTPS y el origen exacto con URL.origin', () => {
  for (const path of ['/mole.mp4', '/mole.webm?firma=1', '/archivo-sin-extension']) {
    assert.equal(remoteVideoSource(origin + path), origin + path)
  }
  assert.equal(remoteVideoSource(`${origin}:443/mole.mp4`), `${origin}/mole.mp4`)
  for (const url of [
    `${origin}.otro.test/mole.mp4`, `${origin}:444/mole.mp4`, `${origin}./mole.mp4`,
    `https://otro.${new URL(origin).host}/mole.mp4`, `https://user:password@${new URL(origin).host}/mole.mp4`,
    `${origin}@otro.test/mole.mp4`, `${origin.replace('https:', 'http:')}/mole.mp4`, 'javascript:alert(1)', 'blob:https://example.test/1',
  ]) assert.equal(remoteVideoSource(url), null, url)
})

test('tarjetas, videos y Compartir renderizan el fallback o control adecuado', async (t) => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false } })
  t.after(() => vite.close())
  const [{ default: Card }, { default: Video }, { default: Share }, { AuthContext }] = await Promise.all([
    vite.ssrLoadModule('/src/components/RecipeCard.jsx'),
    vite.ssrLoadModule('/src/components/RecipeVideo.jsx'),
    vite.ssrLoadModule('/src/components/ShareRecipeAction.jsx'),
    vite.ssrLoadModule('/src/auth/useAuth.js'),
  ])
  const render = (element) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
  const recipe = { id: 1, titulo: 'Mole', categorias: [] }
  assert.match(render(createElement(Card, { recipe })), /class="dish-art/)
  assert.match(render(createElement(Card, { recipe, image: { src: photo.url } })), /alt="Foto de Mole" loading="lazy" width="480" height="143"/)
  const video = render(createElement(Video, { url: `${origin}/mole.webm` }))
  assert.match(video, /<video[^>]*controls="" playsInline="" preload="metadata"/)
  assert.match(video, /<a [^>]*target="_blank" rel="noopener noreferrer"/)
  assert.doesNotMatch(video, /autoplay|<iframe/)
  const external = render(createElement(Video, { url: 'https://example.test/mole.mp4' }))
  assert.doesNotMatch(external, /<video/)
  assert.match(external, /href="https:\/\/example.test\/mole.mp4"/)
  assert.equal(render(createElement(Video, { url: 'https://user@example.test/mole.mp4' })), '')

  const share = (role) => render(createElement(AuthContext.Provider, { value: { user: role ? { roles: [role] } : null } },
    createElement(Share, null, 'Compartir')))
  assert.match(share(null), /href="\/login"/)
  assert.match(share('COCINERO'), /href="\/cocinero\/recetas\/nueva"/)
  for (const role of ['USUARIO', 'MODERADOR', 'ADMIN']) {
    const html = share(role)
    assert.match(html, /<button[^>]*aria-expanded="false"[^>]*>Compartir/)
    assert.match(html, /role="status"/)
    assert.doesNotMatch(html, /disabled|href=/)
  }
})
