import assert from 'node:assert/strict'
import test from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { createAdminUsersService, adminUsersErrorMessage, cookRoleAction } from '../src/services/adminUsersService.js'
import { createAuthSession } from '../src/services/authSession.js'
import { register } from '../src/services/authService.js'
import { adminUserId, canAdminister } from '../src/utils/adminAccess.js'
import { getAuthDestination } from '../src/utils/authDestination.js'
import { canWriteRecipes } from '../src/utils/cookRecipeRules.js'

const admin = { id: 1, nombreVisible: 'Admin de prueba', correo: 'admin@example.invalid', roles: ['ADMIN'] }
const ana = { id: 12, nombreVisible: 'Ana', correo: 'ana@example.invalid', activo: true, creadoEn: '2026-01-01T12:00:00', roles: ['USUARIO'] }
const cook = { ...ana, roles: ['USUARIO', 'COCINERO'] }
const base = '/api/v1/admin/usuarios'
const response = (status) => new Response(null, { status })
const login = () => Response.json({ token: 'token-simulado', tipo: 'Bearer', expiraEnSegundos: 1800 })
const credentials = new URLSearchParams({ email: admin.correo, password: 'solo-pruebas' })
const confirmed = { confirmed: true }
const listing = (pagina = 0, contenido = [ana], totalElementos = 21) => ({
  pagina, contenido, totalElementos, tamano: 20, totalPaginas: Math.ceil(totalElementos / 20),
})

test('409 conocidos presentan mensajes seguros y reconsultan; códigos ajenos no se muestran', async (t) => {
  let codigo = ''
  const { service } = await setup(t, (_path, init) => init.method === 'GET'
    ? Response.json(ana) : Response.json({ codigo, error: 'SQL privado' }, { status: 409 }))
  for (const [value, text] of [
    ['CUENTA_INACTIVA', 'La cuenta está inactiva'],
    ['AUTODESACTIVACION', 'No puedes desactivar tu propia cuenta'],
    ['ULTIMO_ADMIN', 'Debe permanecer al menos un administrador activo'],
    ['CONFLICTO_CONCURRENCIA', 'Los datos cambiaron durante la operación'],
  ]) {
    codigo = value
    const result = await service.changeAccountState(ana, confirmed)
    assert.match(result.conflictMessage, new RegExp(text))
    assert.deepEqual(result.account, ana)
  }
  codigo = 'SQL privado'
  const result = await service.changeAccountState(ana, confirmed)
  assert.equal(result.conflictMessage, undefined)
})

test('confirmación y reconsulta para moderador y estado de cuenta', async (t) => {
  let actual = ana
  const { calls, service } = await setup(t, (_path, init) => {
    if (init.method === 'PUT') { actual = { ...ana, roles: ['USUARIO', 'MODERADOR'] }; return response(204) }
    if (init.method === 'DELETE') { actual = ana; return response(204) }
    if (init.method === 'POST') { actual = { ...actual, activo: !actual.activo }; return response(204) }
    return Response.json(actual)
  })
  await assert.rejects(service.changeModeratorRole(ana), { status: 400 })
  let resultado = await service.changeModeratorRole(ana, confirmed)
  assert.deepEqual(resultado.account.roles, ['USUARIO', 'MODERADOR'])
  assert.equal(calls[0][0], `${base}/12/roles/moderador`)
  resultado = await service.changeModeratorRole(resultado.account, confirmed)
  assert.deepEqual(resultado.account.roles, ['USUARIO'])
  resultado = await service.changeAccountState(resultado.account, confirmed)
  assert.equal(resultado.account.activo, false)
  await assert.rejects(service.changeModeratorRole(resultado.account, confirmed), { status: 409 })
  resultado = await service.changeAccountState(resultado.account, confirmed)
  assert.equal(resultado.account.activo, true)
  assert.ok(calls.some(([path]) => path.endsWith('/desactivar')))
  assert.ok(calls.some(([path]) => path.endsWith('/reactivar')))
})

async function setup(t, handler, profile = admin) {
  const session = createAuthSession()
  t.after(session.dispose)
  const calls = []
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    if (path.endsWith('/auth/login')) return login()
    if (path.endsWith('/auth/me')) return Response.json(profile)
    if (path.endsWith('/auth/logout')) return response(204)
    calls.push([path, init])
    assert.equal(init.headers.Authorization, 'Bearer token-simulado')
    assert.equal(init.credentials, 'omit')
    return handler(path, init)
  })
  await session.signIn(credentials)
  const user = session.getSnapshot().user
  return { calls, session, user, service: createAdminUsersService(session.requestAuthenticated, user, session.requireFreshSignIn) }
}

test('solo ADMIN tiene acceso; permite destinos administrativos internos conocidos', async () => {
  const unusableRequest = () => assert.fail('No debe consultarse la API')
  for (const user of [null, { roles: ['MODERADOR', 'COCINERO', 'USUARIO'] }, { roles: ['admin'] }]) {
    assert.equal(canAdminister(user), false)
    await assert.rejects(createAdminUsersService(unusableRequest, user).list(), { status: user ? 403 : 401 })
  }
  assert.equal(canAdminister(admin), true)
  for (const path of ['/admin', '/admin/usuarios/12?volver=1#detalle', '/admin/catalogos', '/admin/recetas']) {
    assert.equal(getAuthDestination(path), path)
  }
  for (const path of ['//example.invalid/admin', '/admin/../perfil', '/admin/usuarios/%2f%2fexample.invalid',
    '/admin\\usuarios', '/admin/usuarios/0', '/admin/usuarios/12/roles/cocinero']) {
    assert.equal(getAuthDestination(path), '/perfil')
  }
})

test('combina filtros codificados, conserva activo=false y pagina desde cero con tamaño 20', async (t) => {
  const { calls, service } = await setup(t, (path) => {
    const { searchParams } = new URL(path, 'https://example.invalid')
    return Response.json(listing(Number(searchParams.get('pagina'))))
  })
  assert.deepEqual(await service.list(), listing())
  assert.deepEqual(await service.list({ texto: 'Ana +%_!@', rol: 'COCINERO', activo: false, pagina: 1 }), listing(1))
  assert.equal(calls[0][0], `${base}?pagina=0&tamano=20`)
  assert.equal(calls[1][0], `${base}?pagina=1&tamano=20&texto=Ana+%2B%25_%21%40&rol=COCINERO&activo=false`)
  for (const query of [{ texto: 'x'.repeat(101) }, { rol: 'admin' }, { activo: 'false' }, { pagina: -1 },
    { pagina: '2' }, { pagina: 2147483647 }, { pagina: 1.5 }]) {
    await assert.rejects(service.list(query), { status: 400 })
  }
  assert.equal(calls.length, 2)
})

test('valida IDs de ruta, DTO de usuario y metadatos de paginación', async (t) => {
  let payload
  const { calls, service } = await setup(t, () => Response.json(payload))
  assert.equal(adminUserId('12'), 12)
  for (const id of ['0', '1e2', '01', '1/2', '9007199254740992', 0, -2, NaN, 1.25]) {
    assert.equal(adminUserId(id), null)
  }
  for (const id of ['12', 0, 1.2, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(service.detail(id), { status: 400 })
  }
  assert.equal(calls.length, 0)
  for (payload of [null, { ...ana, id: '12' }, { ...ana, id: 13 }, { ...ana, activo: 'true' },
    { ...ana, correo: null }, { ...ana, nombreVisible: 123 }, { ...ana, roles: ['desconocido'] },
    { ...ana, roles: ['ADMIN', 'ADMIN'] }, { ...ana, creadoEn: '2026-02-30T12:00:00' }]) {
    await assert.rejects(service.detail(12), { status: 200 })
  }
  for (payload of [[], { ...listing(), pagina: 2 }, { ...listing(), tamano: 21 },
    { ...listing(), totalElementos: -1 }, { ...listing(), totalPaginas: 1 },
    listing(0, [ana, ana]), listing(0, [null])]) {
    await assert.rejects(service.list(), { status: 200 })
  }
})

test('confirmación e inactividad se comprueban antes de PUT/DELETE; cada 204 consulta detalle sin actualización optimista', async (t) => {
  let account = ana
  const { calls, service } = await setup(t, (_path, { method, headers, body }) => {
    if (method === 'GET') return Response.json(account)
    assert.equal(body, undefined)
    assert.equal(headers['Content-Type'], undefined)
    account = method === 'PUT' ? cook : ana
    return response(204)
  })
  assert.equal(cookRoleAction(ana), 'Asignar rol COCINERO')
  assert.equal(cookRoleAction(cook), 'Retirar rol COCINERO')
  await assert.rejects(service.changeCookRole(ana), { status: 400 })
  await assert.rejects(service.changeCookRole({ ...cook, activo: false }, confirmed), { status: 409 })
  assert.equal(cookRoleAction({ ...cook, activo: false }), null)
  assert.equal(calls.length, 0)
  assert.deepEqual(await service.changeCookRole(ana, confirmed), { kind: 'confirmed', account: cook })
  assert.deepEqual(ana.roles, ['USUARIO'])
  assert.deepEqual(await service.changeCookRole(cook, confirmed), { kind: 'confirmed', account: ana })
  assert.deepEqual(calls.map(([path, { method }]) => [path, method]), [
    [`${base}/12/roles/cocinero`, 'PUT'], [`${base}/12`, 'GET'],
    [`${base}/12/roles/cocinero`, 'DELETE'], [`${base}/12`, 'GET'],
  ])
})

test('400, 403, 404 y 401 no se presentan como escrituras confirmadas; 401 limpia la sesión', async (t) => {
  let status
  const { calls, service, session } = await setup(t, () => response(status))
  for (status of [400, 403, 404, 401]) {
    await assert.rejects(service.changeCookRole(ana, confirmed), { status })
  }
  assert.equal(calls.length, 4)
  assert.equal(session.getSnapshot().user, null)
  assert.match(session.getSnapshot().notice, /sesión/u)
})

test('409, red, 500 y un 200 en lugar de 204 consultan el detalle antes de informar el resultado', async (t) => {
  const inactive = { ...ana, activo: false }
  let status
  let detailUnavailable = false
  const { calls, service } = await setup(t, (_path, { method }) => {
    if (method === 'GET') return detailUnavailable ? response(500) : Response.json(status === 409 ? inactive : cook)
    if (status === 0) throw new TypeError('información interna')
    return response(status)
  })
  for (status of [409, 0, 500, 200]) {
    assert.deepEqual(await service.changeCookRole(ana, confirmed),
      status === 409 ? { kind: 'inactive', account: inactive } : { kind: 'uncertain', account: cook })
  }
  detailUnavailable = true
  status = 204
  const result = await service.changeCookRole(ana, confirmed)
  assert.equal(result.kind, 'confirmed')
  assert.equal(result.account, undefined)
  assert.equal(result.error.status, 500)
  assert.match(adminUsersErrorMessage(result.error), /Inténtalo más tarde/u)
  assert.equal(calls.length, 10)
})

test('si la reconsulta da 401 tras un 204, el aviso de sesión conserva la confirmación del cambio', async (t) => {
  const { service, session } = await setup(t, (_path, { method }) => response(method === 'GET' ? 401 : 204))
  await assert.rejects(service.changeCookRole(ana, confirmed), { status: 401 })
  assert.equal(session.getSnapshot().user, null)
  assert.match(session.getSnapshot().notice, /confirmó.*pendiente.*Vuelve a iniciar sesión/u)
})

test('cancela lecturas obsoletas y serializa escrituras aunque se vuelva a abrir el mismo detalle', async (t) => {
  const obsolete = Promise.withResolvers()
  const obsoleteUnauthorized = Promise.withResolvers()
  const write = Promise.withResolvers()
  const refresh = Promise.withResolvers()
  let detailReads = 0
  const { calls, service, user, session } = await setup(t, (path, { method }) => {
    if (path.includes('texto=obsoleto')) return obsoleteUnauthorized.promise
    if (path.includes('?')) return obsolete.promise
    if (method === 'PUT') return write.promise
    return ++detailReads === 1 ? refresh.promise : Response.json(cook)
  })
  const controller = new AbortController()
  const stale = service.list({}, controller.signal)
  controller.abort()
  obsolete.resolve(Response.json(listing()))
  await assert.rejects(stale, { name: 'AbortError' })
  assert.equal(calls[0][1].signal, controller.signal)
  const obsoleteController = new AbortController()
  const staleUnauthorized = service.list({ texto: 'obsoleto' }, obsoleteController.signal)
  obsoleteController.abort()
  obsoleteUnauthorized.resolve(response(401))
  await assert.rejects(staleUnauthorized, { name: 'AbortError' })
  assert.equal(session.getSnapshot().user, user)
  const pending = service.changeCookRole(ana, confirmed)
  const reopened = createAdminUsersService(session.requestAuthenticated, user)
  await assert.rejects(reopened.changeCookRole(ana, confirmed), { status: 409 })
  const detail = reopened.detail(12)
  assert.equal(detailReads, 0)
  write.resolve(response(204))
  await setImmediate()
  assert.equal(detailReads, 1)
  await assert.rejects(reopened.changeCookRole(ana, confirmed), { status: 409 })
  refresh.resolve(Response.json(cook))
  assert.deepEqual(await pending, { kind: 'confirmed', account: cook })
  assert.deepEqual(await detail, cook)
  assert.equal(calls.filter(([, init]) => init.method === 'PUT').length, 1)
})

test('una operación propia obliga a reautenticar, pero un resultado anterior no afecta a la sesión nueva', async (t) => {
  const ownAccount = { ...ana, ...admin }
  let lateWrite
  const { service, session } = await setup(t, (_path, { method }) =>
    method === 'GET' ? response(500) : (lateWrite?.promise ?? response(204)))
  const { kind, error } = await service.changeCookRole(ownAccount, confirmed)
  assert.equal(kind, 'confirmed')
  assert.equal(error.status, 500)
  assert.equal(session.getSnapshot().user, null)
  assert.match(session.getSnapshot().notice, /confirmó.*pendiente.*Vuelve a iniciar sesión/u)
  await session.signIn(credentials)
  const oldUser = session.getSnapshot().user
  const oldService = createAdminUsersService(session.requestAuthenticated, oldUser, session.requireFreshSignIn)
  lateWrite = Promise.withResolvers()
  const pending = oldService.changeCookRole(ownAccount, confirmed)
  assert.equal(await session.signOut(), true)
  await session.signIn(credentials)
  lateWrite.resolve(response(401))
  await assert.rejects(pending, { name: 'AbortError' })
  assert.notEqual(session.getSnapshot().user, oldUser)
  assert.deepEqual(session.getSnapshot().user, admin)
})

test('flujo HTTP simulado: registro USUARIO, asignación por ADMIN, acceso al editor y retiro', async (t) => {
  let account
  t.mock.method(globalThis, 'fetch', async (path, init) => {
    if (path.endsWith('/auth/registro')) {
      assert.deepEqual(JSON.parse(init.body), { correo: ana.correo, nombreVisible: 'Ana', contrasena: 'solo-pruebas' })
      assert.equal(init.headers.Authorization, undefined)
      account = ana
      return Response.json({ id: ana.id, nombreVisible: ana.nombreVisible, correo: ana.correo }, { status: 201 })
    }
    if (path.endsWith('/auth/login')) {
      const { correo } = JSON.parse(init.body)
      const token = correo === admin.correo ? 'admin-simulado' : 'usuario-simulado'
      return Response.json({ token, tipo: 'Bearer', expiraEnSegundos: 1800 })
    }
    const isAdmin = init.headers.Authorization === 'Bearer admin-simulado'
    if (path.endsWith('/auth/me')) return Response.json(isAdmin ? admin : account)
    if (path.endsWith('/auth/logout')) return response(204)
    assert.equal(isAdmin, true)
    if (path === `${base}/12`) return Response.json(account)
    assert.equal(path, `${base}/12/roles/cocinero`)
    account = init.method === 'PUT' ? cook : ana
    return response(204)
  })
  const adminSession = createAuthSession()
  const userSession = createAuthSession()
  t.after(adminSession.dispose)
  t.after(userSession.dispose)
  const form = new URLSearchParams({ displayName: 'Ana', email: ana.correo, password: 'solo-pruebas' })
  await register(form)
  await userSession.signIn(form)
  assert.deepEqual(userSession.getSnapshot().user.roles, ['USUARIO'])
  assert.equal(canWriteRecipes(userSession.getSnapshot().user), false)

  await adminSession.signIn(credentials)
  const service = createAdminUsersService(adminSession.requestAuthenticated, adminSession.getSnapshot().user)
  assert.deepEqual((await service.changeCookRole(await service.detail(12), confirmed)).account.roles, cook.roles)
  await userSession.signOut()
  await userSession.signIn(form)
  assert.equal(canWriteRecipes(userSession.getSnapshot().user), true)
  assert.equal(canAdminister(userSession.getSnapshot().user), false)

  assert.deepEqual((await service.changeCookRole(await service.detail(12), confirmed)).account.roles, ['USUARIO'])
  await userSession.signOut()
  await userSession.signIn(form)
  assert.equal(canWriteRecipes(userSession.getSnapshot().user), false)
})
