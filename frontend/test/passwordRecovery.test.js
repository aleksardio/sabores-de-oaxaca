import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAuthSession } from '../src/services/authSession.js'
import { createPasswordRecoveryHistory, parseRecoveryToken } from '../src/routes/passwordRecoveryHistory.js'
import { InvalidRecoveryLink, recoveryConfirmation, requestPasswordRecovery, resetPassword } from '../src/services/passwordRecoveryService.js'
import { normalizeRecoveryEmail, validateNewPassword, validateRecoveryEmail } from '../src/utils/authValidation.js'

const values = (data) => new Map(Object.entries(data))
const token = '_-'.repeat(21) + 'A'
const password = ' Ejemplo1! '
const credentials = values({ email: '  Persona@Ejemplo.INVALID ', password, confirmation: password })
const success = () => Response.json({ mensaje: 'Contraseña actualizada' })
const respond = (t, ...responses) => t.mock.method(globalThis, 'fetch', async () => {
  assert.ok(responses.length, 'No se esperaba otra solicitud')
  const response = responses.shift()
  return typeof response === 'function' ? response() : response
})

test('recuperación normaliza como Java, exige correo válido y admite hasta 254 caracteres', () => {
  assert.equal(normalizeRecoveryEmail('\u2000Persona@Ejemplo.INVALID\u2001'), 'persona@ejemplo.invalid')
  assert.deepEqual(validateRecoveryEmail(credentials), {})
  for (const email of ['', ' \u2000 ', 'a@', 'a..b@c.invalid', 'persona@ejemplo.invalid\u00a0']) {
    assert.ok(validateRecoveryEmail(values({ email })).email)
  }
  const email = `a@${[62, 62, 62, 63].map((n) => 'b'.repeat(n)).join('.')}`
  assert.equal(email.length, 254)
  assert.deepEqual(validateRecoveryEmail(values({ email })), {})
  assert.match(validateRecoveryEmail(values({ email: `a${email}` })).email, /254/)
})

test('nueva contraseña comparte las reglas de registro y compara sin recortar', () => {
  const check = (password, confirmation = password) => validateNewPassword(values({ password, confirmation }))
  for (const candidate of [password, 'A1!🌽abc', 'A1abcdef\u00a0', `A1!${'a'.repeat(69)}`, `A1!x${'é'.repeat(34)}`]) {
    assert.deepEqual(check(candidate), {})
  }
  for (const candidate of ['', 'A1!🌽ab', 'a1!abcdef', 'A١!abcdef', 'A1abcdef ', 'A1abcdef²', 'A1abcdef\t']) {
    assert.ok(check(candidate).password)
  }
  assert.match(check(password, password.trim()).confirmation, /no coinciden/)
  assert.match(check(`A1!x${'é'.repeat(34)}x`).password, /72 bytes/)
  assert.match(check(`A1!${'a'.repeat(70)}`).password, /entre 8 y 72/)
})

test('ambos POST exigen el 200 genérico del contrato, sin autenticación, caché ni campos adicionales', async (t) => {
  const fetch = respond(t, Response.json({ mensaje: recoveryConfirmation }), success())
  const signal = new AbortController().signal
  await requestPasswordRecovery(credentials, signal)
  await resetPassword(token, credentials, signal)
  assert.equal(fetch.mock.callCount(), 2)
  for (const [index, path, body] of [
    [0, 'recuperar-contrasena', { correo: 'persona@ejemplo.invalid' }],
    [1, 'restablecer-contrasena', { token, contrasena: password }],
  ]) {
    const [url, options] = fetch.mock.calls[index].arguments
    assert.equal(url, `/api/v1/auth/${path}`)
    assert.deepEqual(options, { method: 'POST', signal, body: JSON.stringify(body),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      credentials: 'omit', redirect: 'error', cache: 'no-store' })
  }
})

test('el servicio no transmite datos por HTTP fuera del entorno de bucle local', async (t) => {
  const fetch = respond(t)
  Object.defineProperty(globalThis, 'location', { configurable: true, value: new URL('http://ejemplo.invalid') })
  t.after(() => { delete globalThis.location })
  await assert.rejects(requestPasswordRecovery(credentials), { message: /mediante HTTPS/ })
  await assert.rejects(resetPassword(token, credentials), { message: /mediante HTTPS/ })
  assert.equal(fetch.mock.callCount(), 0)
})

for (const [name, submit, message] of [
  ['solicitud', requestPasswordRecovery, recoveryConfirmation],
  ['restablecimiento', (data, signal) => resetPassword(token, data, signal), 'Contraseña actualizada'],
]) {
  for (const [status, expected] of [[429, /demasiadas solicitudes.*Espera/], [503, /no está disponible temporalmente/], [500, /No se pudo confirmar/]]) {
    test(`${name}: HTTP ${status} no confirma ni reintenta`, async (t) => {
      const fetch = respond(t, Response.json({ mensaje: message }, { status }))
      await assert.rejects(submit(credentials), { status, message: expected })
      assert.equal(fetch.mock.callCount(), 1)
    })
  }

  test(`${name}: rechaza HTTP no esperado y cuerpos inesperados sin reproducir secretos`, async (t) => {
    const fetch = respond(t, Response.json({ mensaje: message }, { status: 201 }), new Response(null, { status: 204 }),
      new Response('<html>'), Response.json(null), Response.json({ mensaje: password }),
      Response.json({ mensaje: message, extra: token }))
    for (let i = 0; i < 6; i++) await assert.rejects(submit(credentials), { message: /^No se pudo confirmar la operación\./ })
    assert.equal(fetch.mock.callCount(), 6)
  })
}

test('400 de recuperación muestra un mensaje fijo de datos y campo, sin copiar errores recibidos', async (t) => {
  respond(t, Response.json({ campos: { correo: password, token } }, { status: 400 }))
  await assert.rejects(requestPasswordRecovery(credentials), {
    message: 'Revisa el correo y los datos enviados.', fields: { email: 'Revisa el formato del correo electrónico.' },
  })
})

test('400 de restablecimiento separa contraseña, enlace inválido y causa desconocida', async (t) => {
  respond(t, ...[
    { campos: { contrasena: password } }, { campos: { token } }, { error: 'Enlace inválido o vencido' }, { error: password },
  ].map((json) => Response.json(json, { status: 400 })))
  await assert.rejects(resetPassword(token, credentials), { fields: { password: 'La contraseña no cumple los requisitos.' } })
  await assert.rejects(resetPassword(token, credentials), InvalidRecoveryLink)
  await assert.rejects(resetPassword(token, credentials), InvalidRecoveryLink)
  await assert.rejects(resetPassword(token, credentials), { message: /Revisa los datos o solicita otro enlace/ })
})

test('un fallo de conexión es incierto, recomienda iniciar sesión y no repite el POST', async (t) => {
  const fetch = respond(t, () => { throw new Error(token) })
  await assert.rejects(resetPassword(token, credentials), {
    status: 0, message: 'No se pudo confirmar la operación. Intenta iniciar sesión con la nueva contraseña o solicita otro enlace.',
  })
  assert.equal(fetch.mock.callCount(), 1)
})

test('cancelar descarta incluso una respuesta tardía que ignoró AbortController', async (t) => {
  const reply = Promise.withResolvers()
  const fetch = respond(t, () => reply.promise)
  const controller = new AbortController()
  const request = resetPassword(token, credentials, controller.signal)
  controller.abort()
  reply.resolve(success())
  await assert.rejects(request, { name: 'AbortError' })
  await assert.rejects(resetPassword(token, credentials, controller.signal), { name: 'AbortError' })
  assert.equal(fetch.mock.callCount(), 1)
})

test('token estricto: acepta Base64URL de 43 caracteres y rechaza ausentes, duplicados o malformados', () => {
  assert.equal(parseRecoveryToken(`#token=${token}`), token)
  for (const hash of ['', `#${token}`, `#token=${token}&token=${token}`, `#token=${token}=`, `#token=${token}\n`,
    `#token=${token.slice(1)}`, `#token=+${token.slice(1)}`, `#token=%5F${token.slice(1)}`]) {
    assert.equal(parseRecoveryToken(hash), null)
  }
})

function mockBrowser(path) {
  const browser = new EventTarget()
  let state = null
  browser.crypto = globalThis.crypto
  browser.location = new URL(path, 'https://ejemplo.invalid')
  const write = (next, _, path) => {
    state = structuredClone(next)
    if (path) browser.location = new URL(path, browser.location)
  }
  browser.history = { get state() { return state }, replaceState: write, pushState: write }
  return browser
}

test('historial retira el fragmento antes de exponerlo, conserva estado seguro y descarta el flujo al salir', () => {
  const browser = mockBrowser(`/restablecer-contrasena#token=${token}`)
  browser.history.replaceState({ usr: { from: '/favoritos' }, idx: 2 }, '')
  const history = createPasswordRecoveryHistory(browser)
  const entry = history.location
  assert.equal(browser.location.hash, '')
  assert.equal(entry.hash, '')
  assert.deepEqual(entry.state, { from: '/favoritos' })
  assert.equal(browser.history.state.idx, 2)
  assert.ok(!JSON.stringify(browser.history.state).includes(token))
  const flow = history.readResetFlow(entry.key)
  assert.equal(flow.readToken(), token)
  const stop = history.listen(() => assert.equal(history.location.hash, ''))
  stop() // StrictMode vuelve a suscribir sin volver a consumir el enlace.
  history.listen(() => assert.equal(history.location.hash, ''))
  assert.equal(history.readResetFlow(entry.key), flow)
  history.push('/login')
  assert.equal(flow.signal.aborted, true)
  assert.equal(flow.readToken(), null)
  browser.history.replaceState({ key: entry.key }, '', '/restablecer-contrasena')
  browser.dispatchEvent(new Event('popstate'))
  assert.equal(history.readResetFlow(entry.key), null)
})

test('historial sanea navegaciones posteriores y no conserva el token consumido o descartado', () => {
  const browser = mockBrowser('/login')
  const history = createPasswordRecoveryHistory(browser)
  history.listen(({ location }) => {
    assert.equal(location.hash, '')
    assert.equal(location.search, '')
  })
  history.push(`/restablecer-contrasena#token=${token}`)
  const first = history.readResetFlow(history.location.key)
  assert.equal(first.readToken(), token)
  first.forgetToken()
  assert.equal(first.readToken(), null)
  browser.history.pushState(null, '', `/restablecer-contrasena#token=${token}`)
  browser.dispatchEvent(new Event('popstate'))
  browser.dispatchEvent(new Event('hashchange'))
  const second = history.readResetFlow(history.location.key)
  assert.notEqual(first, second)
  assert.equal(second.readToken(), token)
  history.replace(`/restablecer-contrasena?token=${token}#token=${token}`)
  assert.equal(history.readResetFlow(history.location.key), null)
  assert.equal(second.signal.aborted, true)
  assert.equal(second.readToken(), null)
  browser.history.pushState(null, '', `/restablecer-contrasena#token=${token}`)
  browser.dispatchEvent(new Event('hashchange'))
  const third = history.readResetFlow(history.location.key)
  assert.equal(third.readToken(), token)
  browser.dispatchEvent(new Event('pagehide'))
  assert.equal(third.readToken(), null)
  assert.ok(third.signal.aborted)
})

test('las entradas de recuperación anteriores a una recarga no comparten clave ni flujo con las nuevas', () => {
  const clean = '/restablecer-contrasena'
  const link = `${clean}#token=${token}`
  const firstDocument = mockBrowser(link)
  const beforeReload = createPasswordRecoveryHistory(firstDocument)
  const previousEntry = firstDocument.history.state
  const oldFlow = beforeReload.readResetFlow(previousEntry.key)
  firstDocument.dispatchEvent(new Event('pagehide'))

  const newDocument = mockBrowser(clean)
  newDocument.history.replaceState(previousEntry, '', clean)
  const afterReload = createPasswordRecoveryHistory(newDocument)
  assert.equal(afterReload.readResetFlow(previousEntry.key), null)
  const stop = afterReload.listen(() => {})
  newDocument.history.pushState(null, '', link)
  newDocument.dispatchEvent(new Event('popstate'))
  const nextEntry = newDocument.history.state
  const newFlow = afterReload.readResetFlow(nextEntry.key)
  assert.notEqual(previousEntry.key, nextEntry.key)
  assert.equal(newFlow.readToken(), token)
  assert.equal(oldFlow.readToken(), null)

  for (const entry of [previousEntry, nextEntry]) {
    newDocument.history.replaceState(entry, '', clean)
    newDocument.dispatchEvent(new Event('popstate'))
    assert.equal(afterReload.readResetFlow(entry.key), null)
  }
  assert.ok(newFlow.signal.aborted)
  stop()
})

test('una respuesta tardía no puede borrar una sesión nueva, ni se llama al logout remoto', async (t) => {
  const login = () => [
    Response.json({ token: 'jwt-ficticio', tipo: 'Bearer', expiraEnSegundos: 1800 }),
    Response.json({ id: 1, correo: 'persona@ejemplo.invalid', nombreVisible: 'Ficticio', roles: ['USUARIO'] }),
  ]
  const late = Promise.withResolvers()
  const fetch = respond(t, ...login(), () => late.promise, ...login())
  const session = createAuthSession()
  t.after(() => session.dispose())
  await session.signIn(credentials)
  const previousUser = session.getSnapshot().user
  const request = resetPassword(token, credentials)
  session.requireFreshSignIn(previousUser, 'Cierre local')
  assert.equal(session.getSnapshot().user, null)
  await session.signIn(credentials)
  const currentUser = session.getSnapshot().user
  late.resolve(success())
  await request
  session.requireFreshSignIn(previousUser, 'Cierre local tardío')
  assert.equal(session.getSnapshot().user, currentUser)
  assert.equal(fetch.mock.callCount(), 5)
  assert.ok(fetch.mock.calls.every(({ arguments: [url] }) => !url.endsWith('/logout')))
})
