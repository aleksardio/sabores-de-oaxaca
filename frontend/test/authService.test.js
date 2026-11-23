import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getProfile, register } from '../src/services/authService.js'
import { createAuthSession } from '../src/services/authSession.js'
import { getAuthDestination } from '../src/utils/authDestination.js'

const credentials = new Map(Object.entries({
  displayName: 'Persona de prueba',
  email: 'persona@ejemplo.invalid',
  password: ' Ejemplo1! ',
  confirmation: ' Ejemplo1! ',
  roles: ['ADMIN'],
  id: 99,
}))
const profile = {
  id: 1,
  nombreVisible: 'Persona de prueba',
  correo: 'persona@ejemplo.invalid',
  roles: ['USUARIO', 'COCINERO', 'MODERADOR', 'ADMIN'],
}
const token = 'token-ficticio'
const loginResponse = () => Response.json({ token, tipo: 'Bearer', expiraEnSegundos: 1800 })

function mockFetch(t, ...replies) {
  return t.mock.method(globalThis, 'fetch', async () => {
    assert.ok(replies.length, 'No se esperaban más solicitudes')
    const next = replies.shift()
    return typeof next === 'function' ? next() : next
  })
}

function sessionFor(t) {
  const session = createAuthSession()
  t.after(() => session.dispose())
  return session
}

function verifyRequest(call, path, method, body, bearer) {
  const [url, init] = call.arguments
  assert.equal(url, `/api/v1/auth/${path}`)
  assert.equal(init.method, method)
  assert.equal(init.credentials, 'omit')
  assert.equal(init.redirect, 'error')
  assert.equal(init.cache, 'no-store')
  assert.equal(init.headers.Authorization, bearer)
  assert.equal(init.headers['Content-Type'], body ? 'application/json' : undefined)
  assert.deepEqual(body ? JSON.parse(init.body) : init.body, body)
}

test('registro 201 envía solo los campos del contrato, sin Bearer y sin iniciar sesión', async (t) => {
  const { id, nombreVisible, correo } = profile
  const registered = { id, nombreVisible, correo }
  const fetch = mockFetch(t, Response.json(registered, { status: 201 }))
  assert.deepEqual(await register(credentials), registered)
  assert.equal(fetch.mock.callCount(), 1)
  verifyRequest(fetch.mock.calls[0], 'registro', 'POST', {
    nombreVisible: profile.nombreVisible, correo: profile.correo, contrasena: credentials.get('password'),
  })
})

test('registro 400 mapea los campos de Spring Boot y descarta claves desconocidas', async (t) => {
  mockFetch(t, Response.json({
    error: 'Datos inválidos',
    campos: { nombreVisible: 'Nombre inválido', correo: 'Correo inválido', contrasena: 'Contraseña inválida', roles: 'Inválidos' },
  }, { status: 400 }))
  await assert.rejects(register(credentials), {
    status: 400,
    fields: { displayName: 'Nombre inválido', email: 'Correo inválido', password: 'Contraseña inválida' },
  })
})

test('registro 409 muestra el correo duplicado sin reintentar', async (t) => {
  const fetch = mockFetch(t, new Response(null, { status: 409 }))
  await assert.rejects(register(credentials), { status: 409, message: 'El correo ya está registrado.' })
  assert.equal(fetch.mock.callCount(), 1)
})

test('login 200 espera a /me y conserva todos los roles exactos del servidor', async (t) => {
  const session = sessionFor(t)
  const response = Promise.withResolvers()
  const requested = Promise.withResolvers()
  const fetch = mockFetch(t, loginResponse(), () => {
    requested.resolve()
    return response.promise
  })
  const attempt = session.signIn(credentials)
  await requested.promise
  assert.equal(session.getSnapshot().user, null)
  response.resolve(Response.json(profile))
  await attempt
  assert.deepEqual(session.getSnapshot().user, profile)
  verifyRequest(fetch.mock.calls[0], 'login', 'POST', { correo: profile.correo, contrasena: credentials.get('password') })
  verifyRequest(fetch.mock.calls[1], 'me', 'GET', undefined, `Bearer ${token}`)
})

test('login 401 distingue las credenciales incorrectas y no llama a /me', async (t) => {
  const fetch = mockFetch(t, new Response(null, { status: 401 }))
  const session = sessionFor(t)
  await assert.rejects(session.signIn(credentials), { status: 401, message: /no son correctos/ })
  assert.equal(session.getSnapshot().user, null)
  assert.equal(fetch.mock.callCount(), 1)
})

test('login 400 maneja JSON inválido y no llama a /me', async (t) => {
  const fetch = mockFetch(t, new Response('No es JSON', { status: 400 }))
  await assert.rejects(sessionFor(t).signIn(credentials), { status: 400, message: /Revisa los datos/ })
  assert.equal(fetch.mock.callCount(), 1)
})

for (const [status, message] of [[401, /Vuelve a iniciar sesión/], [403, /no autorizó el acceso/]]) {
  test(`/me ${status} no activa el JWT provisional y muestra el motivo correcto`, async (t) => {
    const fetch = mockFetch(t, loginResponse(), new Response(null, { status }))
    const session = sessionFor(t)
    await assert.rejects(session.signIn(credentials), { status, message })
    assert.equal(session.getSnapshot().user, null)
    assert.equal(await session.signOut(), false)
    assert.equal(fetch.mock.callCount(), 2)
  })
}

test('una respuesta tardía de /me cancelada no pisa una sesión más reciente', async (t) => {
  const session = sessionFor(t)
  const response = Promise.withResolvers()
  const requested = Promise.withResolvers()
  const controller = new AbortController()
  mockFetch(t, loginResponse(), () => {
    requested.resolve()
    return response.promise
  }, loginResponse(), Response.json(profile))
  const first = session.signIn(credentials, controller.signal)
  await requested.promise
  controller.abort()
  await session.signIn(credentials)
  response.resolve(Response.json({ ...profile, id: 2 }))
  await assert.rejects(first, { name: 'AbortError' })
  assert.deepEqual(session.getSnapshot().user, profile)
})

test('logout 204 no intenta leer JSON y limpia la sesión', async (t) => {
  const response = new Response(null, { status: 204 })
  const json = t.mock.method(response, 'json')
  const fetch = mockFetch(t, loginResponse(), Response.json(profile), response)
  const session = sessionFor(t)
  await session.signIn(credentials)
  assert.equal(await session.signOut(), true)
  assert.equal(json.mock.callCount(), 0)
  verifyRequest(fetch.mock.calls[2], 'logout', 'POST', undefined, `Bearer ${token}`)
  assert.equal(session.getSnapshot().user, null)
  assert.match(session.getSnapshot().notice, /cerrada en todos/)
})

test('logout 401 elimina la sesión inválida sin afirmar revocación global', async (t) => {
  mockFetch(t, loginResponse(), Response.json(profile), new Response(null, { status: 401 }))
  const session = sessionFor(t)
  await session.signIn(credentials)
  assert.equal(await session.signOut(), true)
  assert.equal(session.getSnapshot().user, null)
  assert.match(session.getSnapshot().notice, /no se pudo confirmar la revocación/i)
})

for (const [description, failure, message] of [
  ['409', () => new Response(null, { status: 409 }), /La cuenta cambió/],
  ['de red', () => { throw new TypeError('Error de transporte') }, /No pudimos conectar/],
]) {
  test(`logout con error ${description} no reintenta y permite abandonar solo la sesión local`, async (t) => {
    const fetch = mockFetch(t, loginResponse(), Response.json(profile), failure)
    const session = sessionFor(t)
    await session.signIn(credentials)
    assert.equal(await session.signOut(), false)
    assert.deepEqual(session.getSnapshot().user, profile)
    assert.match(session.getSnapshot().logoutError, message)
    assert.match(session.getSnapshot().logoutError, /No se pudo confirmar/)
    assert.equal(session.leaveLocally(), true)
    assert.equal(session.getSnapshot().user, null)
    assert.match(session.getSnapshot().notice, /Saliste de este navegador.*No se pudo confirmar/)
    assert.equal(fetch.mock.callCount(), 3)
  })
}

test('un fallo de red en login genera un mensaje seguro y no reintenta', async (t) => {
  const fetch = mockFetch(t, () => { throw new TypeError('detalle privado') })
  await assert.rejects(sessionFor(t).signIn(credentials), { status: 0, message: /No pudimos conectar/ })
  assert.equal(fetch.mock.callCount(), 1)
})

test('el JWT no se expone en el estado ni se restaura en una sesión nueva; no hay solicitudes autenticadas sin token', async (t) => {
  const fetch = mockFetch(t, loginResponse(), Response.json(profile))
  const session = sessionFor(t)
  await session.signIn(credentials)
  assert.doesNotMatch(JSON.stringify(session.getSnapshot()), /token-ficticio/)
  const fresh = sessionFor(t)
  assert.equal(fresh.getSnapshot().user, null)
  assert.equal(await fresh.signOut(), false)
  await assert.rejects(getProfile(undefined), { status: 401 })
  assert.equal(fetch.mock.callCount(), 2)
})

test('la sesión se elimina al expirar, sin refresh ni otras solicitudes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const fetch = mockFetch(t, loginResponse(), Response.json(profile))
  const session = sessionFor(t)
  await session.signIn(credentials)
  t.mock.timers.tick(1800 * 1000)
  assert.equal(session.getSnapshot().user, null)
  assert.match(session.getSnapshot().notice, /venció/)
  assert.equal(fetch.mock.callCount(), 2)
})

test('solo se conservan destinos internos conocidos, incluidos búsqueda y fragmento', () => {
  assert.equal(getAuthDestination('/favoritos'), '/favoritos')
  assert.equal(getAuthDestination('/recetas?region=Mixteca#lista'), '/recetas?region=Mixteca#lista')
  for (const unsafe of ['//otro.invalid', 'https://otro.invalid', '/\\otro.invalid', '/%2f%2fotro.invalid', '/login', '/api/v1/auth/me', '/perfil/../login', '/recetas/..']) {
    assert.equal(getAuthDestination(unsafe), '/perfil')
  }
})
