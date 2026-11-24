import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthSession } from '../src/services/authSession.js'
import { createCookRecipesService } from '../src/services/cookRecipesService.js'
import { getCategories } from '../src/services/recipesService.js'
import { getAuthDestination } from '../src/utils/authDestination.js'
import { createRecipeOperation, resolveRecipeConflict, saveAndRequestReview } from '../src/utils/cookRecipeActions.js'
import { canDeleteRecipe, canEditRecipe, canReviewRecipe, canWriteRecipes, recipeStates } from '../src/utils/cookRecipeRules.js'
import { draftFromDetail, toRecipeBody, validateRecipeDraft } from '../src/utils/recipeEditorValidation.js'

const receipt = { id: 73, estado: 'BORRADOR', version: 0 }
const summary = { ...receipt, titulo: 'Salsa', tipo: 'COMUN', porcionesBase: 4, eliminadoEn: null }
const detail = {
  ...summary, descripcion: 'Salsa casera', preparacion: 'Tostar y moler.',
  categorias: [{ id: 11, nombre: 'Salsas', descripcion: null }],
  ingredientes: [{ id: 28, nombre: 'Chile', cantidadBase: 2.5, cantidadAjustada: null, unidad: 'G', orden: 7, nota: 'Molido' },
    { id: 54, nombre: 'Sal', cantidadBase: null, cantidadAjustada: null, unidad: 'AL_GUSTO', orden: 8, nota: null }],
  multimedia: [{ id: 65, tipo: 'VIDEO', url: 'https://ejemplo.invalid/video', textoAlternativo: 'Salsa', orden: 3 }],
}

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
    assert.equal(canReviewRecipe(cook, active), estado === 'BORRADOR')
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
