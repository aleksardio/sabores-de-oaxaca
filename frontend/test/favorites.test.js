import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { createAuthSession } from '../src/services/authSession.js'
import { createFavoritesService } from '../src/services/favoritesService.js'
import { createFavoritesStore } from '../src/services/favoritesStore.js'

const credentials = new Map([['email', 'ana@ejemplo.invalid'], ['password', 'Ejemplo1!']])
const profile = { id: 1, nombreVisible: 'Ana', correo: 'ana@ejemplo.invalid', roles: ['USUARIO'] }
const recipe = { id: 8, titulo: 'Mole', descripcion: 'Preparación', tipo: 'COMUN', porcionesBase: 4, categorias: [] }
const loginResponse = (token = 'jwt-en-memoria') => Response.json({ token, tipo: 'Bearer', expiraEnSegundos: 1800 })
const response = (status) => new Response(null, { status })

function sessionFor(t) {
  const session = createAuthSession()
  t.after(() => session.dispose())
  return session
}

function serviceFor(session) {
  const { user } = session.getSnapshot()
  return createFavoritesService((path, opts) => session.requestAuthenticated(user, path, opts))
}

function mockFetch(t, ...replies) {
  return t.mock.method(globalThis, 'fetch', async (...args) => {
    const next = replies.shift()
    return typeof next === 'function' ? next(...args) : next
  })
}

test('GET, POST y DELETE usan Bearer; las mutaciones sin cuerpo no leen JSON del 204', async (t) => {
  const added = response(204)
  const removed = response(204)
  const addJson = t.mock.method(added, 'json')
  const removeJson = t.mock.method(removed, 'json')
  const fetch = mockFetch(t, loginResponse(), Response.json(profile), Response.json([recipe]), added, removed)
  const session = sessionFor(t)
  await session.signIn(credentials)
  const service = serviceFor(session)
  assert.deepEqual(await service.list(), [recipe])
  assert.equal(await service.add(8), undefined)
  assert.equal(await service.remove(8), undefined)
  assert.equal(addJson.mock.callCount() + removeJson.mock.callCount(), 0)
  assert.deepEqual(fetch.mock.calls.slice(2).map(({ arguments: [url, init] }) => [
    url, init.method, init.headers.Authorization, init.body, init.headers['Content-Type'], init.credentials,
  ]), [
    ['/api/v1/favoritos', 'GET', 'Bearer jwt-en-memoria', undefined, undefined, 'omit'],
    ['/api/v1/favoritos/8', 'POST', 'Bearer jwt-en-memoria', undefined, undefined, 'omit'],
    ['/api/v1/favoritos/8', 'DELETE', 'Bearer jwt-en-memoria', undefined, undefined, 'omit'],
  ])
})

test('sin sesión no hay llamada; 403, 404 y fallos de red no cierran sesión, 401 sí', async (t) => {
  const fetch = mockFetch(t, loginResponse(), Response.json(profile), response(403), response(404),
    () => { throw new TypeError('detalle interno') }, response(401))
  const session = sessionFor(t)
  await assert.rejects(serviceFor(session).list(), { status: 401 })
  assert.equal(fetch.mock.callCount(), 0)
  await session.signIn(credentials)
  const service = serviceFor(session)
  await assert.rejects(service.list(), { status: 403, message: /No tienes autorización/ })
  await assert.rejects(service.add(8), { status: 404, message: /ya no está disponible/ })
  await assert.rejects(service.remove(8), { status: 0, message: /No pudimos conectar/ })
  assert.deepEqual(session.getSnapshot().user, profile)
  await assert.rejects(service.list(), { status: 401 })
  assert.equal(session.getSnapshot().user, null)
  assert.match(session.getSnapshot().notice, /Vuelve a iniciar sesión/)
  await assert.rejects(service.list(), { status: 401 })
  assert.equal(fetch.mock.callCount(), 6)
})

test('un 401 tardío de favoritos no invalida una sesión nueva', async (t) => {
  const previous = Promise.withResolvers()
  mockFetch(t, loginResponse(), Response.json(profile), () => previous.promise, response(204),
    loginResponse('nuevo'), Response.json(profile), Response.json([]))
  const session = sessionFor(t)
  await session.signIn(credentials)
  const oldList = serviceFor(session).list()
  assert.equal(await session.signOut(), true)
  await session.signIn(credentials)
  previous.resolve(response(401))
  await assert.rejects(oldList, { status: 401 })
  assert.deepEqual(await serviceFor(session).list(), [])
  assert.deepEqual(session.getSnapshot().user, profile)
})

test('tras recrear la sesión no se restaura el JWT; al entrar de nuevo el servidor devuelve el favorito guardado', async (t) => {
  for (const name of ['localStorage', 'sessionStorage', 'document']) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error(`No se debe usar ${name}`) } })
    t.after(() => original ? Object.defineProperty(globalThis, name, original) : Reflect.deleteProperty(globalThis, name))
  }
  let persisted = []
  const fetch = t.mock.method(globalThis, 'fetch', async (path, init) => {
    if (path.endsWith('/login')) return loginResponse()
    if (path.endsWith('/me')) return Response.json(profile)
    assert.equal(init.credentials, 'omit')
    if (init.method === 'POST') {
      persisted = [recipe]
      return response(204)
    }
    return Response.json(persisted)
  })
  const old = sessionFor(t)
  await old.signIn(credentials)
  await serviceFor(old).add(8)
  old.dispose()
  const fresh = sessionFor(t)
  assert.equal(fresh.getSnapshot().user, null)
  await assert.rejects(serviceFor(fresh).list(), { status: 401 })
  assert.equal(fetch.mock.callCount(), 3)
  await fresh.signIn(credentials)
  assert.deepEqual(await serviceFor(fresh).list(), [recipe])
  assert.doesNotMatch(JSON.stringify(fresh.getSnapshot()), /jwt-en-memoria/)
})

test('el estado compartido evita GET y mutaciones duplicadas, y aplica cambios solo tras 204', async (t) => {
  const list = Promise.withResolvers()
  const add = Promise.withResolvers()
  const fetch = mockFetch(t, loginResponse(), Response.json(profile), () => list.promise, () => add.promise,
    Response.json([recipe]), () => { throw new TypeError('red') }, response(204))
  const session = sessionFor(t)
  await session.signIn(credentials)
  const store = createFavoritesStore(serviceFor(session))
  const loading = store.load()
  await store.load()
  assert.equal(store.getSnapshot().loading, true)
  assert.equal(fetch.mock.callCount(), 3)
  list.resolve(Response.json([]))
  await loading
  assert.deepEqual(store.getSnapshot().recipes, [])
  const adding = store.toggle(recipe)
  await store.toggle(recipe)
  await store.load() // Una navegación durante POST difiere el GET hasta después.
  assert.equal(fetch.mock.callCount(), 4)
  assert.equal(store.getSnapshot().pending.has(8), true)
  assert.deepEqual(store.getSnapshot().recipes, [])
  const refreshed = Promise.withResolvers()
  const unsubscribe = store.subscribe(() => {
    if (!store.getSnapshot().loading && fetch.mock.callCount() === 5) refreshed.resolve()
  })
  add.resolve(response(204))
  await adding
  await refreshed.promise
  unsubscribe()
  assert.deepEqual(store.getSnapshot().recipes, [recipe])
  await store.toggle(recipe)
  assert.equal(store.getSnapshot().failures.get(8).status, 0)
  assert.deepEqual(store.getSnapshot().recipes, [recipe])
  await store.toggle(recipe)
  assert.deepEqual(store.getSnapshot().recipes, [])
  assert.equal(store.getSnapshot().failures.size, 0)
})

test('la página presenta acceso, carga, error con reintento, vacío y controles reales', async (t) => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false } })
  t.after(() => vite.close())
  const { default: FavoritesPage } = await vite.ssrLoadModule('/src/pages/FavoritesPage.jsx')
  const { FavoritesContext } = await vite.ssrLoadModule('/src/favorites/useFavorites.js')
  const { AuthContext } = await vite.ssrLoadModule('/src/auth/useAuth.js')
  const render = (user, store) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/favoritos'] },
    createElement(AuthContext.Provider, { value: { user } },
      createElement(FavoritesContext.Provider, { value: store }, createElement(FavoritesPage)))))

  const visitor = render(null, null)
  assert.match(visitor, /href="\/login"/)
  assert.match(visitor, /href="\/recetas"/)
  assert.doesNotMatch(visitor, /Cargando favoritos|Quitar de favoritos/)

  const result = Promise.withResolvers()
  mockFetch(t, loginResponse(), Response.json(profile), () => result.promise, Response.json([]), Response.json([recipe]))
  const session = sessionFor(t)
  await session.signIn(credentials)
  const store = createFavoritesStore(serviceFor(session))
  const loading = store.load()
  assert.match(render(profile, store), /Cargando favoritos/)
  result.resolve(response(403))
  await loading
  const failed = render(profile, store)
  assert.match(failed, /role="alert"/)
  assert.match(failed, /No tienes autorización.*Reintentar favoritos/)
  assert.doesNotMatch(failed, /Aún no tienes/)
  await store.load()
  assert.match(render(profile, store), /Aún no tienes recetas favoritas/)
  await store.load()
  assert.match(render(profile, store), /href="\/recetas\/8".*Quitar de favoritos: Mole/)
})
