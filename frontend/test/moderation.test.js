import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthSession } from '../src/services/authSession.js'
import { createModerationService } from '../src/services/moderationService.js'
import { getAuthDestination } from '../src/utils/authDestination.js'
import { canModerate, isOwnModerationRecipe } from '../src/utils/moderationAccess.js'
import { createModerationReview } from '../src/utils/moderationReview.js'
import { draftFromDetail } from '../src/utils/recipeEditorValidation.js'

const summary = { id: 42, titulo: 'Mole', tipo: 'COMUN', autorId: 8, autor: 'Autora', version: 1 }
const detail = {
  ...summary, version: 3, estado: 'PENDIENTE', descripcion: 'Mole casero', preparacion: 'Tostar y moler.',
  porcionesBase: 4, categorias: [{ id: 5, nombre: 'Moles', descripcion: null }],
  ingredientes: [{ id: 6, nombre: 'Chile', cantidadBase: 2.5, cantidadAjustada: null, unidad: 'G', orden: 2, nota: 'Molido' },
    { id: 7, nombre: 'Sal', cantidadBase: null, cantidadAjustada: null, unidad: 'AL_GUSTO', orden: 1, nota: null }],
  multimedia: [{ id: 9, tipo: 'VIDEO', url: 'https://ejemplo.invalid/video', textoAlternativo: 'Tostado', orden: 3 }],
}
const receipt = (estado, version = 4) => ({ id: 42, estado, version })
const status = (code) => new Response(null, { status: code })
const page = (pagina = 0, contenido = [summary], totalElementos = contenido.length) =>
  ({ contenido, pagina, tamano: 12, totalElementos, totalPaginas: Math.ceil(totalElementos / 12) })
const base = '/api/v1/moderacion/recetas'

async function setup(t, respond, roles = ['MODERADOR']) {
  const session = createAuthSession()
  t.after(() => session.dispose())
  let account = 1
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/auth/login')) return Response.json({ token: `test-${account}`, tipo: 'Bearer', expiraEnSegundos: 300 })
    if (url.endsWith('/auth/me')) return Response.json({ id: account, nombreVisible: 'Prueba', correo: 'prueba@example.invalid', roles })
    if (url.endsWith('/auth/logout')) return status(204)
    calls.push({ url, ...options })
    return respond(url, options)
  })
  const login = () => session.signIn(new Map([['email', 'prueba@example.invalid'], ['password', 'no-real']]))
  await login()
  const user = session.getSnapshot().user
  const service = createModerationService(session.requestAuthenticated, user)
  return { service, calls, session, user, review: createModerationReview(service, user, 42),
    switchAccount: async () => { await session.signOut(); account++; await login() } }
}

test('solo MODERADOR o ADMIN acceden, sin jerarquía ni consultas privadas desde cuentas denegadas', async () => {
  for (const roles of [['MODERADOR'], ['ADMIN'], ['COCINERO', 'ADMIN', 'MODERADOR']]) {
    assert.equal(canModerate({ roles }), true)
  }
  for (const roles of [['USUARIO'], ['COCINERO'], ['USUARIO', 'COCINERO'], ['admin'], []]) {
    const user = { id: 1, roles }
    assert.equal(canModerate(user), false)
    const service = createModerationService(() => assert.fail('Consulta privada'), user)
    await assert.rejects(service.list(), { status: 403 })
    await assert.rejects(service.detail(42), { status: 403 })
  }
  await assert.rejects(createModerationService(() => assert.fail(), null).list(), { status: 401 })
})

test('el retorno del login acepta solo rutas internas del panel', () => {
  for (const url of ['/moderador', '/moderador/recetas?pagina=1&tipo=COMUN', '/moderador/recetas/42#mod-preview',
    '/moderador/reportes', '/moderador/reportes/2']) assert.equal(getAuthDestination(url), url)
  for (const url of ['//example.invalid/moderador', 'https://example.invalid/moderador', '/moderador/../admin',
    '/moderador\\recetas', '/moderador/recetas/%2f42', '/moderador/recetas/42/editar', '/moderador/recetas/0']) {
    assert.equal(getAuthDestination(url), '/perfil')
  }
})

test('consulta autenticada con página y filtro en servidor, tamaño fijo y detalle por ID real', async (t) => {
  const { service, calls } = await setup(t, (url) => {
    if (url.endsWith('/42')) return Response.json(detail)
    const params = new URL(url, 'http://localhost').searchParams
    return Response.json(page(Number(params.get('pagina')), [summary], 13))
  }, ['ADMIN'])
  assert.equal((await service.list()).totalPaginas, 2)
  assert.equal((await service.list(1, 'COMUN')).pagina, 1)
  const recipe = await service.detail(42)
  assert.deepEqual(recipe, detail)
  const draft = draftFromDetail(recipe)
  assert.deepEqual(draft.ingredients.map(({ name, quantity, unit, note, order }) => [name, quantity, unit, note, order]),
    [['Chile', '2.5', 'G', 'Molido', '2'], ['Sal', null, 'AL_GUSTO', '', '1']])
  assert.deepEqual(calls.map(({ url, method, headers }) => [url, method, headers.Authorization]), [
    [`${base}?pagina=0&tamano=12`, 'GET', 'Bearer test-1'],
    [`${base}?pagina=1&tamano=12&tipo=COMUN`, 'GET', 'Bearer test-1'],
    [`${base}/42`, 'GET', 'Bearer test-1'],
  ])
  await assert.rejects(service.list(0, 'PENDIENTE'), { status: 400 })
  await assert.rejects(service.list(-1, 'COMUN'), { status: 400 })
  assert.equal(calls.length, 3)
})

test('ni siquiera MODERADOR más ADMIN puede decidir sobre una receta propia', async (t) => {
  const own = { ...detail, autorId: 1 }
  const { user, service, review, calls } = await setup(t, () => Response.json(own), ['MODERADOR', 'ADMIN'])
  assert.equal(isOwnModerationRecipe(user, own), true)
  await review.load()
  review.setReason('Justificación')
  for (const action of ['approve', 'reject']) {
    review.prepare(action)
    assert.equal(review.getSnapshot().confirmation, null)
    await review.confirm()
    await assert.rejects(service[action](own, 'Justificación'), { status: 403 })
  }
  assert.equal(calls.length, 1)
})

for (const [action, endpoint, estado] of [['approve', 'aprobar', 'PUBLICADA'], ['reject', 'rechazar', 'RECHAZADA']]) {
  test(`${endpoint}: confirmación explícita, If-Match del detalle, respuesta 200 y cola actualizada al volver`, async (t) => {
    let decided = false
    const { service, review, calls } = await setup(t, (url, { method }) => {
      if (method === 'POST') {
        decided = true
        return Response.json(receipt(estado))
      }
      return Response.json(url.endsWith('/42') ? detail : page(0, decided ? [] : [summary]))
    })
    assert.equal((await service.list()).contenido[0].version, 1)
    await review.load()
    review.setReason('  La preparación necesita más detalle.  ')
    review.prepare(action)
    assert.equal(calls.length, 2)
    await review.confirm()
    assert.equal(calls[2].url, `${base}/42/${endpoint}`)
    assert.equal(calls[2].method, 'POST')
    assert.equal(calls[2].headers['If-Match'], '"3"')
    assert.equal(calls[2].headers['Content-Type'], action === 'reject' ? 'application/json' : undefined)
    assert.equal(calls[2].body, action === 'reject' ? JSON.stringify({ motivo: 'La preparación necesita más detalle.' }) : undefined)
    assert.deepEqual(review.getSnapshot().receipt, receipt(estado))
    review.prepare(action)
    await review.confirm()
    assert.equal(calls.length, 3)
    assert.deepEqual((await service.list()).contenido, [])
  })
}

test('el rechazo valida motivo recortado; editar o cancelar invalida una confirmación', async (t) => {
  const { service, review, calls } = await setup(t, (_, { method }) => Response.json(method === 'POST' ? receipt('RECHAZADA') : detail))
  await review.load()
  for (const reason of ['', ' \n\t ', ' x'.repeat(1001)]) {
    review.setReason(reason)
    review.prepare('reject')
    assert.ok(review.getSnapshot().reasonError)
    await review.confirm()
    await assert.rejects(service.reject(detail, reason), { status: 400 })
  }
  review.setReason(` ${'x'.repeat(1000)} `)
  review.prepare('reject')
  review.dismiss()
  await review.confirm()
  review.prepare('reject')
  review.setReason(`  ${'y'.repeat(1000)}  `)
  await review.confirm()
  assert.equal(calls.length, 1)
  review.prepare('reject')
  await review.confirm()
  assert.equal(JSON.parse(calls[1].body).motivo, 'y'.repeat(1000))
})

for (const gone of [false, true]) {
  test(`409 no repite el POST y conserva el motivo; detalle ${gone ? 'ya no disponible' : 'con nueva versión'}`, async (t) => {
    let posts = 0
    const { review, calls } = await setup(t, (_, { method }) => {
      if (method === 'POST') return ++posts === 1 ? status(409) : Response.json(receipt('RECHAZADA', 8))
      return posts && gone ? status(404) : Response.json(posts ? { ...detail, titulo: 'Versión nueva', version: 7 } : detail)
    })
    await review.load()
    review.setReason('Conservar motivo')
    review.prepare('reject')
    await review.confirm()
    const state = review.getSnapshot()
    assert.match(state.notice, /cambió/)
    assert.equal(state.reason, 'Conservar motivo')
    assert.equal(state.confirmation, null)
    assert.deepEqual(calls.map(({ method }) => method), ['GET', 'POST', 'GET'])
    await review.confirm()
    assert.equal(posts, 1)
    if (gone) {
      assert.equal(state.loadError.status, 404)
      assert.equal(state.recipe, null)
      assert.equal(state.receipt, null)
      review.prepare('approve')
      await review.confirm()
      assert.equal(posts, 1)
    } else {
      assert.equal(state.recipe.titulo, 'Versión nueva')
      review.prepare('reject')
      await review.confirm()
      assert.equal(calls[3].headers['If-Match'], '"7"')
    }
  })
}

test('no hay doble envío; red, 5xx y 200 inesperado obligan a consultar antes de otra decisión', async (t) => {
  let respondPost
  let respondGet
  let verifying = false
  const { review, calls } = await setup(t, (_, { method }) => {
    if (method === 'POST') return new Promise((resolve, reject) => { respondPost = { resolve, reject } })
    return verifying ? new Promise((resolve) => { respondGet = resolve }) : Response.json(detail)
  })
  await review.load()
  review.setReason('Motivo conservado')
  for (const fail of [() => respondPost.reject(new TypeError('offline')),
    () => respondPost.resolve(status(500)), () => respondPost.resolve(Response.json({}))]) {
    const previousCalls = calls.length
    review.prepare('reject')
    const pending = review.confirm()
    assert.equal(review.getSnapshot().busy, true)
    review.prepare('approve')
    await review.confirm()
    assert.equal(calls.length, previousCalls + 1)
    verifying = true
    fail()
    // El suscriptor observa el inicio del GET sin esperar tiempos arbitrarios.
    await new Promise((resolve) => {
      const off = review.subscribe(() => {
        if (review.getSnapshot().loading) { off(); resolve() }
      })
    })
    assert.match(review.getSnapshot().notice, /No se pudo confirmar/)
    review.prepare('approve')
    await review.confirm()
    assert.equal(calls.length, previousCalls + 2)
    respondGet(Response.json(detail))
    await pending
    assert.equal(review.getSnapshot().reason, 'Motivo conservado')
  }
})

test('400 conserva el motivo; 403 bloquea decisiones y conserva la sesión; 401 la invalida', async (t) => {
  let code = 400
  const { review, user, session, service } = await setup(t, (_, { method }) => method === 'POST' || code === 401
    ? status(code) : Response.json(detail))
  await review.load()
  review.setReason('Motivo para corregir')
  for (code of [400, 403]) {
    review.prepare('reject')
    await review.confirm()
    assert.equal(review.getSnapshot().reason, 'Motivo para corregir')
    assert.ok(review.getSnapshot().decisionError)
    assert.equal(review.getSnapshot().blocked, code === 403)
    assert.equal(session.getSnapshot().user, user)
  }
  code = 401
  await assert.rejects(service.detail(42), { status: 401 })
  assert.equal(session.getSnapshot().user, null)
})

test('si se vuelve al detalle durante un POST, primero espera el resultado y luego consulta', async (t) => {
  let complete
  let pending = true
  const { user, session, review, calls } = await setup(t, (_, { method }) => {
    if (method === 'POST') return new Promise((resolve) => {
      complete = () => { pending = false; resolve(Response.json(receipt('PUBLICADA'))) }
    })
    return pending ? Response.json(detail) : status(404)
  })
  await review.load()
  review.prepare('approve')
  const submission = review.confirm()
  review.cancel()
  const reopened = createModerationReview(createModerationService(session.requestAuthenticated, user), user, 42)
  const fresh = reopened.load()
  assert.equal(reopened.getSnapshot().loading, true)
  reopened.prepare('reject')
  await reopened.confirm()
  assert.deepEqual(calls.map(({ method }) => method), ['GET', 'POST'])
  complete()
  await Promise.all([submission, fresh])
  assert.equal(review.getSnapshot().receipt, null)
  assert.equal(reopened.getSnapshot().loadError.status, 404)
  assert.deepEqual(calls.map(({ method }) => method), ['GET', 'POST', 'GET'])
})

test('cancela consultas al cambiar de detalle y no expone resultados ni aplica un 401 de otra sesión', async (t) => {
  const resolve = []
  const { service, review, session, calls, switchAccount } = await setup(t, () =>
    new Promise((reply) => { resolve.push(reply) }))
  const first = review.load()
  const second = review.load()
  resolve[1](Response.json(detail))
  await second
  resolve[0](Response.json({ ...detail, titulo: 'Resultado obsoleto' }))
  await first
  assert.equal(calls[0].signal.aborted, true)
  assert.equal(review.getSnapshot().recipe.titulo, detail.titulo)
  const lateSuccess = service.detail(42)
  const lateError = service.list()
  await switchAccount()
  resolve[2](Response.json(detail))
  resolve[3](status(401))
  await assert.rejects(lateSuccess, { name: 'AbortError' })
  await assert.rejects(lateError, { status: 401 })
  assert.equal(session.getSnapshot().user.id, 2)
})

test('rechaza respuestas malformadas y decisiones sin la nueva versión o con otro estado', async (t) => {
  let result = { ...page(), tamano: 50 }
  const { service } = await setup(t, () => Response.json(result))
  await assert.rejects(service.list(), { status: 200 })
  result = { ...detail, ingredientes: [{ ...detail.ingredientes[0], orden: 0 }] }
  await assert.rejects(service.detail(42), { status: 200 })
  for (result of [receipt('PUBLICADA', 3), receipt('RECHAZADA'), { ...receipt('PUBLICADA'), id: 7 }]) {
    await assert.rejects(service.approve(detail), { status: 200 })
  }
})
