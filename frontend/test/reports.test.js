import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuthSession } from '../src/services/authSession.js'
import { createReportsService, isUncertainReportWrite } from '../src/services/reportsService.js'
import { getAuthDestination } from '../src/utils/authDestination.js'
import { createReportReview } from '../src/utils/reportReview.js'

const base = '/api/v1/moderacion/reportes'
const recipe = { id: 12, autor: { id: 4, nombreVisible: 'Ana' } }
const created = { id: 7, recetaId: 12, motivo: 'Información incorrecta', estado: 'ABIERTO', creadoEn: '2026-11-24T12:00:00.123456' }
const detail = { ...created, titulo: 'Mole', reportante: 'Ana', resueltoEn: null }
const closed = (estado = 'DESCARTADO') => ({ ...detail, estado, resueltoEn: '2026-11-24T12:01:00' })
const status = (code) => new Response(null, { status: code })
const page = (pagina, contenido, totalElementos = contenido.length) => ({
  pagina, contenido, tamano: 12, totalElementos, totalPaginas: Math.ceil(totalElementos / 12),
})

async function setup(t, respond, roles = ['MODERADOR']) {
  const session = createAuthSession()
  const calls = []
  let loginNumber = 0
  t.after(() => session.dispose())
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/auth/login')) return Response.json({ token: `test-${++loginNumber}`, tipo: 'Bearer', expiraEnSegundos: 60 })
    if (url.endsWith('/auth/me')) return Response.json({ id: 2, nombreVisible: 'Ana', correo: 'test@example.invalid', roles })
    if (url.endsWith('/auth/logout')) return status(204)
    calls.push({ url, ...options })
    return respond(url, options)
  })
  const login = () => session.signIn(new Map([['email', 'test@example.invalid'], ['password', 'ficticia']]))
  await login()
  const user = session.getSnapshot().user
  const newService = () => createReportsService(session.requestAuthenticated, session.getSnapshot().user)
  return { service: newService(), newService, session, user, calls,
    switchSession: async () => { await session.signOut(); await login() } }
}

test('una cuenta USUARIO crea reportes sin COCINERO y solo confirma un 201 válido', async (t) => {
  const responses = [Response.json(created, { status: 201 }), Response.json(created),
    Response.json({ ...created, recetaId: 13 }, { status: 201 }), status(204)]
  const { service, calls } = await setup(t, () => responses.shift(), ['USUARIO'])
  assert.deepEqual(await service.create(recipe, ` ${created.motivo} `), created)
  for (const code of [200, 201, 204]) await assert.rejects(service.create(recipe, created.motivo), { status: code })
  assert.equal(calls.length, 4)
  for (const { url, method, headers, body } of calls) {
    assert.equal(url, '/api/v1/recetas/12/reportes')
    assert.equal(method, 'POST')
    assert.equal(headers.Authorization, 'Bearer test-1')
    assert.equal(headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(body), { motivo: created.motivo })
  }
})

test('motivo obligatorio y válido, ID positivo y restricción del autor por ID (no por nombre)', async (t) => {
  const { service, calls, user } = await setup(t, () => Response.json({ ...created, motivo: 'x'.repeat(500) }, { status: 201 }))
  for (const motivo of ['', ' \t\n', 'x'.repeat(501)]) await assert.rejects(service.create(recipe, motivo), { status: 400 })
  await assert.rejects(service.create({ ...recipe, id: '12' }, 'Motivo'), { status: 400 })
  await assert.rejects(service.create({ ...recipe, autor: { id: user.id, nombreVisible: 'Otro nombre' } }, 'Motivo'), {
    status: 403, message: /propia receta/u,
  })
  assert.equal(calls.length, 0)
  await service.create(recipe, 'x'.repeat(500))
  assert.equal(calls.length, 1)
})

test('duplicado informado por el servidor, red incierta sin reenvío y nuevo intento explícito', async (t) => {
  let count = 0
  const { service, calls } = await setup(t, () => {
    count++
    if (count === 1) return status(409)
    if (count === 2) throw new Error('sin red')
    return Response.json(created, { status: 201 })
  }, ['USUARIO'])
  await assert.rejects(service.create(recipe, created.motivo), { status: 409, message: /reporte pendiente/u })
  await assert.rejects(service.create(recipe, created.motivo), (error) => isUncertainReportWrite(error) && error.status === 0)
  assert.equal(calls.length, 2)
  await service.create(recipe, created.motivo)
  assert.equal(calls.length, 3)
})

test('un envío en curso no permite otro POST de creación al reabrir la receta', async (t) => {
  const gate = Promise.withResolvers()
  const { service, newService, calls } = await setup(t, () => gate.promise, ['USUARIO'])
  const pending = service.create(recipe, created.motivo)
  await assert.rejects(newService().create(recipe, created.motivo), { status: 409, message: /en curso/u })
  gate.resolve(Response.json(created, { status: 201 }))
  await pending
  assert.equal(calls.length, 1)
})

for (const role of ['MODERADOR', 'ADMIN']) {
  test(`${role}: lista filtrada y paginada en el servidor y detalle por ID numérico`, async (t) => {
    const { service, calls } = await setup(t, (url) => Response.json(url.endsWith('/7')
      ? detail : url.includes('estado=EN_REVISION') ? page(1, [{ ...detail, estado: 'EN_REVISION' }], 13) : page(0, [detail])), [role])
    assert.equal((await service.list()).pagina, 0)
    assert.equal((await service.list({ estado: 'EN_REVISION', pagina: 1 })).totalPaginas, 2)
    assert.deepEqual(await service.detail(7), detail)
    for (const id of [0, -1, '7', Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(service.detail(id), { status: 400 })
    for (const filters of [{ estado: 'PUBLICADA' }, { pagina: -1 }, { pagina: 2147483647 }]) {
      await assert.rejects(service.list(filters), { status: 400 })
    }
    assert.deepEqual(calls.map(({ url, method, headers }) => [url, method, headers.Authorization]), [
      [`${base}?pagina=0&tamano=12`, 'GET', 'Bearer test-1'],
      [`${base}?pagina=1&tamano=12&estado=EN_REVISION`, 'GET', 'Bearer test-1'],
      [`${base}/7`, 'GET', 'Bearer test-1'],
    ])
  })
}

test('roles no editoriales no leen reportes privados y un 403 real no cierra la sesión', async (t) => {
  for (const user of [null, { id: 2, roles: ['USUARIO', 'COCINERO'] }]) {
    const service = createReportsService(() => assert.fail('Lectura privada no permitida'), user)
    await assert.rejects(service.list(), { status: user ? 403 : 401 })
  }
  const { service, session, user } = await setup(t, () => status(403))
  await assert.rejects(service.detail(7), { status: 403 })
  assert.equal(session.getSnapshot().user, user)
})

test('rechaza DTO de moderación inválidos: IDs, fecha UTC, resolución, estados y metadatos', async (t) => {
  const responses = [
    ...[{ id: 0 }, { recetaId: '12' }, { creadoEn: '2026-02-30T12:00:00' }, { creadoEn: '2026-01-01T00:00:00+01:00' },
      { reportante: null }, { motivo: '  ' }, { estado: 'PUBLICADA' }, { resueltoEn: undefined },
      { estado: 'RESUELTO', resueltoEn: null }].map((fields) => page(0, [{ ...detail, ...fields }])),
    page(0, [detail, detail]), { ...page(0, [detail]), totalPaginas: 2 }, { ...page(0, [detail]), tamano: 13 },
    { ...page(0, [detail]), pagina: 1 }, { ...page(0, [detail]), totalElementos: -1 }, page(0, [closed()]),
  ]
  const { service } = await setup(t, () => Response.json(responses.shift()))
  while (responses.length) await assert.rejects(service.list({ estado: 'ABIERTO' }), { status: 200 })
})

for (const [action, estado] of [['descartar', 'DESCARTADO'], ['dar-baja', 'RESUELTO']]) {
  test(`${action}: confirmación y cancelación, sin cuerpo ni If-Match; solo un POST y estado de la API`, async (t) => {
    const gate = Promise.withResolvers()
    const { service, newService, calls } = await setup(t, (_, { method }) => method === 'GET' ? Response.json(detail) : gate.promise)
    const review = createReportReview(service, 7)
    await review.load()
    await assert.rejects(service.decide(detail, action), { status: 400 })
    review.prepare(action)
    review.dismiss()
    await review.confirm()
    assert.equal(calls.length, 1)
    review.prepare(action)
    const pending = review.confirm()
    await review.confirm()
    await assert.rejects(newService().decide({ ...detail, id: 8 }, action, { confirmed: true }), { status: 409 })
    assert.equal(review.getSnapshot().report.estado, 'ABIERTO')
    assert.equal(review.getSnapshot().busy, true)
    assert.deepEqual(calls.map(({ url, method }) => [url, method]), [[`${base}/7`, 'GET'], [`${base}/7/${action}`, 'POST']])
    assert.equal(calls[1].body, undefined)
    assert.equal(calls[1].headers['If-Match'], undefined)
    assert.equal(calls[1].headers['Content-Type'], undefined)
    gate.resolve(Response.json(closed(estado)))
    await pending
    assert.equal(review.getSnapshot().report.estado, estado)
    assert.equal(review.getSnapshot().confirmed, true)
    review.prepare(action)
    assert.equal(review.getSnapshot().confirmation, null)
  })
}

for (const failure of [409, 500, 0, 200]) {
  test(`${failure}: reconsulta después del resultado incierto sin repetir POST ni desbloquear al reabrir`, async (t) => {
    const gate = Promise.withResolvers()
    const { service, newService, calls } = await setup(t, (_, { method }) => {
      if (method === 'GET') return calls.length === 1 ? Response.json(detail) : gate.promise.then(() => Response.json(closed('RESUELTO')))
      if (failure === 0) throw new Error('red')
      return failure === 200 ? Response.json({ ...closed('RESUELTO'), id: 8 }) : status(failure)
    })
    const review = createReportReview(service, 7)
    await review.load()
    review.prepare('dar-baja')
    const write = review.confirm()
    review.cancel()
    const reopened = createReportReview(newService(), 7)
    const read = reopened.load()
    assert.equal(reopened.getSnapshot().loading, true)
    gate.resolve()
    await Promise.all([write, read])
    assert.deepEqual(calls.map(({ method }) => method), ['GET', 'POST', 'GET', 'GET'])
    assert.equal(reopened.getSnapshot().report.estado, 'RESUELTO')
    assert.equal(reopened.getSnapshot().confirmed, false)
    assert.equal(review.getSnapshot().report.estado, 'ABIERTO')
  })
}

test('si la reconciliación falla, no hay decisión nueva hasta reconsultar y confirmar de nuevo', async (t) => {
  const responses = [Response.json(detail), status(409), status(500), Response.json(detail), Response.json(closed())]
  const { service, calls } = await setup(t, () => responses.shift())
  const review = createReportReview(service, 7)
  await review.load()
  review.prepare('descartar')
  await review.confirm()
  assert.equal(review.getSnapshot().loadError.status, 500)
  assert.equal(review.getSnapshot().report, null)
  review.prepare('descartar')
  await review.confirm()
  assert.equal(calls.length, 3)
  await review.load()
  assert.equal(review.getSnapshot().report.estado, 'ABIERTO')
  await review.confirm()
  assert.equal(calls.length, 4)
  review.prepare('descartar')
  await review.confirm()
  assert.equal(review.getSnapshot().report.estado, 'DESCARTADO')
})

for (const code of [400, 403, 404, 401]) {
  test(`${code}: una decisión rechazada no confirma ni reintenta la escritura`, async (t) => {
    const inReview = { ...detail, estado: 'EN_REVISION' }
    const { service, calls, session, user } = await setup(t, (_, { method }) =>
      method === 'GET' ? Response.json(inReview) : status(code))
    const review = createReportReview(service, 7)
    await review.load()
    review.prepare('dar-baja')
    await review.confirm()
    const state = review.getSnapshot()
    assert.equal(state.confirmed, false)
    assert.deepEqual(calls.map(({ method }) => method), ['GET', 'POST'])
    assert.equal(session.getSnapshot().user, code === 401 ? null : user)
    if (code === 404) {
      assert.equal(state.report, null)
      assert.equal(state.loadError.status, 404)
    } else {
      assert.equal(state.report.estado, 'EN_REVISION')
      assert.equal(state.decisionError.status, code)
      assert.equal(state.forbidden, code !== 400)
    }
  })
}

test('cancela lecturas obsoletas; ni un éxito ni un 401 tardío cruzan a una nueva sesión', async (t) => {
  const gates = Array.from({ length: 3 }, () => Promise.withResolvers())
  const { service, newService, calls, user, session, switchSession } = await setup(t, () =>
    (gates[calls.length - 1]?.promise ?? Response.json(detail)))
  const abort = new AbortController()
  const obsolete = service.list({ estado: 'ABIERTO' }, abort.signal)
  abort.abort()
  const oldRead = service.detail(7)
  const oldWrite = service.create(recipe, created.motivo)
  await switchSession()
  gates[0].resolve(status(401))
  gates[1].resolve(status(401))
  gates[2].resolve(Response.json(created, { status: 201 }))
  for (const promise of [obsolete, oldRead, oldWrite]) await assert.rejects(promise, { name: 'AbortError' })
  assert.equal(calls[0].signal.aborted, true)
  assert.notEqual(session.getSnapshot().user, user)
  assert.deepEqual(await newService().detail(7), detail)
  assert.equal(calls.at(-1).headers.Authorization, 'Bearer test-2')
})

test('destinos de login conservan reportes numéricos y rutas seguras de administración, recetas y cocinero', () => {
  for (const path of ['/moderador/reportes/7?estado=RESUELTO', '/admin/usuarios/2', '/recetas/12#receta', '/cocinero/recetas/5/editar']) {
    assert.equal(getAuthDestination(path), path)
  }
  for (const path of ['/moderador/reportes/REP-007', '/moderador/reportes/0', '/moderador/reportes/%2F7', '//evil.invalid/recetas/12']) {
    assert.equal(getAuthDestination(path), '/perfil')
  }
})
