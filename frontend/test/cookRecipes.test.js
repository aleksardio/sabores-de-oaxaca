import assert from 'node:assert/strict'
import test from 'node:test'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { createAuthSession } from '../src/services/authSession.js'
import { createCookRecipesService } from '../src/services/cookRecipesService.js'
import { getCategories } from '../src/services/recipesService.js'
import { getAuthDestination } from '../src/utils/authDestination.js'
import { createRecipeOperation, resolveRecipeConflict, saveAndRequestReview } from '../src/utils/cookRecipeActions.js'
import { canDeleteRecipe, canEditRecipe, canReviewRecipe, canWriteRecipes, recipeStates } from '../src/utils/cookRecipeRules.js'
import { getIngredientChoices, searchIngredients, selectIngredient } from '../src/utils/ingredientSelection.js'
import { draftFromDetail, toRecipeBody, validateRecipeDraft, validateRecipeForReview } from '../src/utils/recipeEditorValidation.js'

const receipt = { id: 73, estado: 'BORRADOR', version: 0 }
const summary = { ...receipt, titulo: 'Salsa', tipo: 'COMUN', porcionesBase: 4, eliminadoEn: null }
const detail = {
  ...summary, descripcion: 'Salsa casera', preparacion: 'Tostar y moler.',
  categorias: [{ id: 11, nombre: 'Salsas', descripcion: null }],
  ingredientes: [{ id: 28, nombre: 'Chile', cantidadBase: 2.5, cantidadAjustada: null, unidad: 'G', orden: 7, nota: 'Molido' },
    { id: 54, nombre: 'Sal', cantidadBase: null, cantidadAjustada: null, unidad: 'AL_GUSTO', orden: 8, nota: null }],
  multimedia: [{ id: 65, tipo: 'VIDEO', url: 'https://ejemplo.invalid/video', textoAlternativo: 'Salsa', orden: 3 }],
}
const rejected = { ...detail, estado: 'RECHAZADA', version: 3 }

test('el selector usa los IDs y nombres del catálogo en orden y conserva los demás campos', () => {
  const draft = draftFromDetail(detail)
  const catalog = [{ id: 91, nombre: 'Maíz' }, { id: 28, nombre: 'Chile' }, { id: 54, nombre: 'Sal' }]
  const rows = draft.ingredients
  assert.deepEqual(getIngredientChoices(catalog, rows, rows[0]), [
    { id: 91, label: 'Maíz', disabled: false }, { id: 28, label: 'Chile', disabled: false }, { id: 54, label: 'Sal', disabled: true },
  ])
  assert.equal(selectIngredient(catalog, rows, rows[0].id, '54'), rows)
  assert.equal(selectIngredient(catalog, rows, rows[0].id, '999'), rows)
  const selected = selectIngredient(catalog, rows, rows[0].id, '91')
  assert.deepEqual(selected[0], { ...rows[0], ingredientId: '91', name: 'Maíz' })
  assert.equal(selected[1], rows[1])
  assert.deepEqual(toRecipeBody({ ...draft, ingredients: selected }).ingredientes[0], {
    ingredienteId: 91, cantidad: 2.5, unidad: 'G', orden: 7, nota: 'Molido',
  })
  const duplicate = { ...selected[1], ingredientId: '91' }
  const errors = validateRecipeDraft({ ...draft, ingredients: [selected[0], duplicate] })
  assert.match(errors['ingredient-54-ingredientId'], /repetido/)
})

test('referencia ausente del catálogo se muestra sin perder sus datos ni impedir guardar', () => {
  const draft = draftFromDetail(detail)
  const rows = draft.ingredients
  assert.deepEqual(getIngredientChoices([], rows, rows[0]), [{ id: 28, label: 'Chile (no disponible)', disabled: true }])
  assert.deepEqual(getIngredientChoices(undefined, rows, rows[0]), [{ id: 28, label: 'Chile', disabled: true }])
  assert.equal(selectIngredient(undefined, rows, rows[0].id, '91'), rows)
  assert.deepEqual(validateRecipeDraft({ ...draft, title: 'Corrección' }), {})
  assert.equal(toRecipeBody(draft).ingredientes[0].ingredienteId, 28)
})

test('busca ingredientes por nombre parcial, sin distinguir acentos o mayúsculas y sin reordenar', () => {
  const catalog = [{ id: 40, nombre: 'Masa de maíz' }, { id: 54, nombre: 'Sal' }, { id: 91, nombre: 'Maíz' }]
  assert.deepEqual(searchIngredients(catalog, 'maiz'), [catalog[0], catalog[2]])
  assert.deepEqual(searchIngredients(catalog, '  MASA   DE MAÍZ '), [catalog[0]])
  assert.equal(searchIngredients(catalog, '  '), catalog)
  assert.deepEqual(searchIngredients(catalog, 'tomate'), [])
  assert.deepEqual(searchIngredients([], 'maiz'), [])
})

test('la búsqueda conserva la selección por fila y no habilita opciones duplicadas', () => {
  const rows = draftFromDetail(detail).ingredients
  const catalog = [{ id: 91, nombre: 'Maíz' }, { id: 28, nombre: 'Chile' }, { id: 54, nombre: 'Sal' }]
  const matches = searchIngredients(catalog, 'SAL')
  assert.deepEqual(getIngredientChoices(catalog, rows, rows[0], matches), [
    { id: 28, label: 'Chile', disabled: false }, { id: 54, label: 'Sal', disabled: true },
  ])
  assert.equal(selectIngredient(matches, rows, rows[0].id, '54'), rows)
  assert.deepEqual(getIngredientChoices(catalog, rows, rows[0], searchIngredients(catalog, 'tomate')), [
    { id: 28, label: 'Chile', disabled: false },
  ])
  const updated = selectIngredient(searchIngredients(catalog, 'maiz'), rows, rows[0].id, '91')
  assert.deepEqual(updated[0], { ...rows[0], ingredientId: '91', name: 'Maíz' })
  assert.deepEqual(getIngredientChoices(catalog, updated, updated[0], matches), [
    { id: 91, label: 'Maíz', disabled: false }, { id: 54, label: 'Sal', disabled: true },
  ])
  const withoutChile = catalog.filter(({ id }) => id !== 28)
  assert.deepEqual(getIngredientChoices(withoutChile, rows, rows[0], []), [
    { id: 28, label: 'Chile (no disponible)', disabled: true },
  ])
})

test('editor y vista previa renderizan nombres, opciones reales y la referencia ausente', async (t) => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false } })
  t.after(() => vite.close())
  const { default: RecipeEditorForm } = await vite.ssrLoadModule('/src/components/RecipeEditorForm.jsx')
  const { default: RecipeDraftPreview } = await vite.ssrLoadModule('/src/components/RecipeDraftPreview.jsx')
  const draft = draftFromDetail(rejected)
  const catalog = [{ id: 91, nombre: 'Maíz' }, { id: 54, nombre: 'Sal' }]
  const html = renderToStaticMarkup(createElement(RecipeEditorForm, {
    draft, errors: {}, categories: { data: detail.categorias }, ingredients: { data: catalog },
    onReview() {}, reviewLabel: 'Reenviar a revisión',
  }))
  assert.match(html, /<label for="recipe-ingredient-search">Buscar ingrediente por nombre<\/label><input type="search"[^>]*id="recipe-ingredient-search"/)
  assert.match(html, /<label for="ingredient-28-ingredientId">Ingrediente<\/label><select[^>]*>/)
  assert.match(html, /<option value="28" disabled="" selected="">Chile \(no disponible\)<\/option><option value="91">Maíz<\/option><option value="54" disabled="">Sal<\/option>/)
  assert.match(html, />Reenviar a revisión<\/button>/)
  const ingredients = selectIngredient(catalog, draft.ingredients, draft.ingredients[0].id, '91')
  const preview = renderToStaticMarkup(createElement(RecipeDraftPreview, { recipe: { ...draft, ingredients } }))
  assert.match(preview, /Maíz.*Molido/)
  assert.doesNotMatch(preview, /Ingrediente ID 91/)
})

async function setup(t, respond, roles = ['USUARIO', 'COCINERO']) {
  const session = createAuthSession()
  t.after(() => session.dispose())
  const calls = []
  let account = 1
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/auth/login')) return Response.json({ token: `test-${account}`, tipo: 'Bearer', expiraEnSegundos: 300 })
    if (url.endsWith('/auth/me')) return Response.json({ id: account, nombreVisible: 'Prueba', correo: 'prueba@example.invalid', roles })
    if (url.endsWith('/auth/logout')) return new Response(null, { status: 204 })
    calls.push({ url, ...options })
    return respond(url, options)
  })
  const login = () => session.signIn(new Map([['email', 'prueba@example.invalid'], ['password', 'no-real']]))
  await login()
  const user = session.getSnapshot().user
  const service = createCookRecipesService(session.requestAuthenticated, user)
  return { service, calls, session, user, switchAccount: async () => { await session.signOut(); account++; await login() } }
}

test('lista propia y paginación del servidor; lectura con ADMIN sin COCINERO', async (t) => {
  const { service, calls, user } = await setup(t, (url) => {
    const pagina = Number(new URL(url, 'http://localhost').searchParams.get('pagina'))
    return Response.json({ contenido: [{ ...summary, eliminadoEn: pagina ? '2026-11-23T00:00:00' : null }], pagina, tamano: 12, totalPaginas: 2, totalElementos: 13 })
  }, ['ADMIN'])
  assert.equal(canWriteRecipes(user), false)
  assert.equal((await service.list()).totalElementos, 13)
  assert.ok((await service.list(1)).contenido[0].eliminadoEn)
  assert.deepEqual(calls.map(({ url, method, headers }) => [url, method, headers.Authorization]), [
    ['/api/v1/mis-recetas?pagina=0&tamano=12', 'GET', 'Bearer test-1'],
    ['/api/v1/mis-recetas?pagina=1&tamano=12', 'GET', 'Bearer test-1'],
  ])
})

test('detalle propio y PUT completo conservan IDs de ingrediente, cantidad, multimedia y versión', async (t) => {
  const { service, calls } = await setup(t, (_url, options) =>
    Response.json(options.method === 'GET' ? detail : { ...receipt, version: 1 }))
  const draft = draftFromDetail(await service.detail(73))
  assert.equal(draft.ingredients[0].name, 'Chile')
  const body = toRecipeBody(draft)
  const saved = await service.update(73, body, 0)
  assert.equal(saved.version, 1)
  assert.equal(calls[0].url, '/api/v1/mis-recetas/73')
  assert.equal(calls[1].method, 'PUT')
  assert.deepEqual(JSON.parse(calls[1].body), {
    titulo: 'Salsa', descripcion: 'Salsa casera', preparacion: 'Tostar y moler.', tipo: 'COMUN', porcionesBase: 4,
    categorias: [11], ingredientes: [
      { ingredienteId: 28, cantidad: 2.5, unidad: 'G', orden: 7, nota: 'Molido' },
      { ingredienteId: 54, cantidad: null, unidad: 'AL_GUSTO', orden: 8, nota: null },
    ],
    multimedia: [{ tipo: 'VIDEO', url: 'https://ejemplo.invalid/video', textoAlternativo: 'Salsa', orden: 3 }], version: 0,
  })
  assert.equal(calls[1].headers['If-Match'], undefined)
})

test('creación con 201 sin versión, autor, estado ni ingredientes; categorías sin Bearer', async (t) => {
  const { service, calls } = await setup(t, (url) => url.endsWith('/categorias')
    ? Response.json(detail.categorias) : Response.json(receipt, { status: 201 }))
  const draft = { ...draftFromDetail(detail), categories: [], ingredients: [], multimedia: [] }
  assert.deepEqual(validateRecipeDraft(draft), {})
  assert.deepEqual(await service.create(toRecipeBody(draft)), receipt)
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].url, '/api/v1/mis-recetas')
  assert.deepEqual(JSON.parse(calls[0].body), {
    titulo: 'Salsa', descripcion: 'Salsa casera', preparacion: 'Tostar y moler.', tipo: 'COMUN', porcionesBase: 4,
    categorias: [], ingredientes: [], multimedia: [],
  })
  assert.deepEqual(await getCategories(), detail.categorias)
  assert.equal(calls[1].headers.Authorization, undefined)
})

test('baja usa If-Match entre comillas, no lee JSON del 204 y se puede volver a consultar', async (t) => {
  const deleted = { ...detail, version: 1, eliminadoEn: '2026-11-23T00:00:00' }
  const empty = new Response(null, { status: 204 })
  const parse = t.mock.method(empty, 'json', () => { throw new Error('204 no tiene JSON') })
  const { service, calls } = await setup(t, (_url, options) => options.method === 'DELETE' ? empty : Response.json(deleted))
  assert.equal(await service.remove(73, 0), undefined)
  assert.equal(parse.mock.callCount(), 0)
  assert.equal(calls[0].headers['If-Match'], '"0"')
  assert.equal(calls[0].headers['Content-Type'], undefined)
  assert.equal(calls[0].body, undefined)
  assert.equal((await service.detail(73)).eliminadoEn, deleted.eliminadoEn)
})

test('revisión guarda los cambios primero y usa la versión del PUT en If-Match, sin cuerpo', async (t) => {
  const { service, calls } = await setup(t, (_url, options) => options.method === 'PUT'
    ? Response.json({ ...receipt, version: 1 }) : Response.json({ ...receipt, version: 2, estado: 'PENDIENTE' }))
  const body = toRecipeBody({ ...draftFromDetail(detail), title: 'Cambios' })
  const onSave = t.mock.fn()
  const saved = await saveAndRequestReview(service, detail, body, undefined, onSave)
  assert.equal(onSave.mock.calls[0].arguments[0].version, 1)
  assert.equal(saved.estado, 'PENDIENTE')
  assert.equal(saved.version, 2)
  assert.deepEqual(calls.map(({ method }) => method), ['PUT', 'POST'])
  assert.equal(calls[1].url, '/api/v1/mis-recetas/73/enviar-revision')
  assert.equal(calls[1].headers['If-Match'], '"1"')
  assert.equal(calls[1].body, undefined)
})

test('rechazada completa sin cambios se reenvía directamente con su versión vigente', async (t) => {
  const { service, calls } = await setup(t, () => Response.json({ ...receipt, version: 4, estado: 'PENDIENTE' }))
  assert.equal((await saveAndRequestReview(service, rejected, null, undefined, () => assert.fail())).estado, 'PENDIENTE')
  assert.deepEqual(calls.map(({ method, headers, body }) => [method, headers['If-Match'], body]), [['POST', '"3"', undefined]])
})

test('rechazada con cambios conserva RECHAZADA tras PUT y reenvía con la nueva versión', async (t) => {
  const updated = { ...receipt, version: 4, estado: 'RECHAZADA' }
  const pending = { ...receipt, version: 5, estado: 'PENDIENTE' }
  const { service, calls } = await setup(t, (_url, options) => Response.json(options.method === 'PUT' ? updated : pending))
  const body = toRecipeBody({ ...draftFromDetail(rejected), description: 'Corregida' })
  const onSaved = t.mock.fn()
  assert.deepEqual(await saveAndRequestReview(service, rejected, body, undefined, onSaved), pending)
  assert.deepEqual(onSaved.mock.calls[0].arguments[0], { ...rejected, ...updated })
  assert.deepEqual(calls.map(({ method }) => method), ['PUT', 'POST'])
  assert.deepEqual(JSON.parse(calls[0].body), { ...body, version: 3 })
  assert.equal(calls[1].headers['If-Match'], '"4"')
  assert.equal(calls[1].body, undefined)
})

test('rechazada no se reenvía cuando falla PUT', async (t) => {
  const { service, calls } = await setup(t, () => new Response(null, { status: 503 }))
  await assert.rejects(saveAndRequestReview(service, rejected, toRecipeBody(draftFromDetail(rejected)), undefined, () => assert.fail()), { status: 503 })
  assert.deepEqual(calls.map(({ method }) => method), ['PUT'])
})

test('rechazada conserva la corrección guardada y la versión del PUT ante 409 del POST, sin reintentos', async (t) => {
  let version
  let savedTitle
  const { service, calls } = await setup(t, (_url, { method, body }) => {
    if (method === 'PUT') {
      savedTitle = JSON.parse(body).titulo
      return Response.json({ ...receipt, version: 4, estado: 'RECHAZADA' })
    }
    assert.equal(version, 4, 'la versión local se actualiza antes del POST')
    return new Response(null, { status: 409 })
  })
  const local = { ...draftFromDetail(rejected), title: 'Corrección confirmada' }
  await assert.rejects(saveAndRequestReview(service, rejected, toRecipeBody(local), undefined, (saved) => {
    version = saved.version
    assert.equal(saved.estado, 'RECHAZADA')
  }), { status: 409 })
  assert.equal(savedTitle, local.title)
  assert.equal(version, 4)
  assert.deepEqual(calls.map(({ method }) => method), ['PUT', 'POST'])
})

test('409 no reintenta ni envía a revisión; la comparación conserva texto local hasta decidir', async (t) => {
  const server = { ...detail, version: 7, titulo: 'Servidor' }
  const { service, calls } = await setup(t, (_url, options) =>
    options.method === 'PUT' ? new Response(null, { status: 409 }) : Response.json(server))
  const local = { ...draftFromDetail(detail), title: 'Sin guardar' }
  await assert.rejects(saveAndRequestReview(service, detail, toRecipeBody(local), undefined, () => assert.fail()), { status: 409 })
  assert.equal(calls.length, 1)
  const current = draftFromDetail(await service.detail(73))
  assert.deepEqual(resolveRecipeConflict(local, current, true), { draft: local, baseline: current })
  assert.deepEqual(resolveRecipeConflict(local, current, false), { draft: current, baseline: current })
  assert.equal(local.title, 'Sin guardar')
  assert.deepEqual(calls.map(({ method }) => method), ['PUT', 'GET'])
})

test('si falla la revisión tras guardar, la versión devuelta por PUT sigue confirmada', async (t) => {
  const { service, calls } = await setup(t, (_url, options) => options.method === 'PUT'
    ? Response.json({ ...receipt, version: 1 }) : new Response(null, { status: 409 }))
  const body = toRecipeBody(draftFromDetail(detail))
  const onSaved = t.mock.fn()
  await assert.rejects(saveAndRequestReview(service, detail, body, undefined, onSaved), { status: 409 })
  assert.equal(onSaved.mock.callCount(), 1)
  assert.equal(onSaved.mock.calls[0].arguments[0].version, 1)
  assert.deepEqual(calls.map(({ method }) => method), ['PUT', 'POST'])
})

test('solo un envío incluso con eventos antes de que React deshabilite el formulario', async (t) => {
  let reply
  const { service, calls } = await setup(t, () => new Promise((resolve) => { reply = resolve }))
  const operation = createRecipeOperation()
  async function save() {
    const attempt = operation.start()
    if (!attempt) return
    try { return await service.create(toRecipeBody(draftFromDetail(detail)), attempt.signal) }
    finally { operation.finish(attempt) }
  }
  const pending = save()
  assert.equal(await save(), undefined)
  assert.equal(calls.length, 1)
  reply(Response.json(receipt, { status: 201 }))
  assert.deepEqual(await pending, receipt)
})

test('401 invalida la sesión; un 403, 400, 404, 5xx, red o respuesta inesperada no la cierran', async (t) => {
  let status
  const { service, session, user } = await setup(t, () => {
    if (status === 0) throw new TypeError('offline')
    return status === 200 ? Response.json({}) : new Response(null, { status })
  })
  for (status of [403, 400, 404, 502, 0, 200, 201]) {
    await assert.rejects(service.detail(73), { status })
    assert.equal(session.getSnapshot().user, user)
  }
  status = 401
  await assert.rejects(service.detail(73), { status: 401 })
  assert.equal(session.getSnapshot().user, null)
})

test('cancela solicitudes obsoletas y no entrega resultados ni invalida otra cuenta', async (t) => {
  const finish = []
  const { service, calls, session, switchAccount } = await setup(t, () => new Promise((resolve) => finish.push(resolve)))
  const controller = new AbortController()
  const first = service.list(0, controller.signal)
  controller.abort()
  finish[0](Response.json({}))
  await assert.rejects(first, { name: 'AbortError' })
  assert.equal(calls[0].signal.aborted, true)
  const lateSuccess = service.detail(73)
  const late401 = service.list()
  await switchAccount()
  finish[1](Response.json(detail))
  finish[2](new Response(null, { status: 401 }))
  await assert.rejects(lateSuccess, { name: 'AbortError' })
  await assert.rejects(late401, { status: 401 })
  assert.equal(session.getSnapshot().user.id, 2)
})

test('permisos editoriales, baja independiente del estado y retornos de login seguros', () => {
  const cook = { roles: ['COCINERO'] }
  assert.equal(canWriteRecipes({ roles: ['ADMIN', 'COCINERO'] }), true)
  for (const estado of Object.keys(recipeStates)) {
    const active = { estado, eliminadoEn: null }
    assert.equal(canDeleteRecipe(cook, active), true)
    assert.equal(canEditRecipe(cook, active), ['BORRADOR', 'RECHAZADA'].includes(estado))
    assert.equal(canReviewRecipe(cook, active), ['BORRADOR', 'RECHAZADA'].includes(estado))
    for (const check of [canDeleteRecipe, canEditRecipe, canReviewRecipe]) {
      assert.equal(check({ roles: ['ADMIN'] }, active), false)
      assert.equal(check(cook, { ...active, eliminadoEn: '2026-11-23' }), false)
    }
  }
  for (const url of ['/cocinero', '/cocinero/recetas?pagina=1', '/cocinero/recetas/nueva',
    '/cocinero/recetas/73/editar', '/cocinero/recetas/73/vista-previa']) assert.equal(getAuthDestination(url), url)
  for (const url of ['//example.invalid/cocinero', '/cocinero/recetas/73/borrar', '/cocinero/../admin', '/cocinero\\recetas']) {
    assert.equal(getAuthDestination(url), '/perfil')
  }
})

test('validación y acción de revisión rechazan estados incompatibles y bajas', async () => {
  const draft = draftFromDetail(rejected)
  const body = toRecipeBody(draft)
  assert.deepEqual(validateRecipeForReview(draft, detail), {})
  assert.deepEqual(validateRecipeForReview(draft, rejected), {})
  for (const record of [
    ...['PENDIENTE', 'PUBLICADA', 'ARCHIVADA'].map((estado) => ({ ...rejected, estado })),
    { ...rejected, eliminadoEn: '2026-11-23' }, { ...detail, eliminadoEn: '2026-11-23' },
  ]) {
    assert.ok(validateRecipeForReview(draft, record).state)
    assert.equal(await saveAndRequestReview({ update: assert.fail, review: assert.fail }, record, body), null)
    assert.equal(await saveAndRequestReview({ review: assert.fail }, record, null), null)
  }
})
