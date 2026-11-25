import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { createServer, preview } from 'vite'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const root = fileURLToPath(new URL('..', import.meta.url))
const token = 'A'.repeat(43)
const otherToken = 'B'.repeat(43)
const email = 'persona@ejemplo.invalid'
const password = ' Nueva1! '
const recovery = '/recuperar-contrasena'
const reset = '/restablecer-contrasena'
const generic = 'Si la cuenta existe, recibirá instrucciones de recuperación'
const unavailable = 'La recuperación de contraseña no está disponible temporalmente. Inténtalo más tarde.'
const success = { mensaje: 'Contraseña actualizada' }
const resetEndpoint = `/api/v1/auth${reset}`
const originalLinkHelp = /vuelve a abrir el enlace original/
const category = { id: 2, nombre: 'Salsas' }
const recipe = { id: 12, titulo: 'Mole ficticio', tipo: 'TRADICIONAL_OAXAQUENA', porcionesBase: 4, categorias: [category] }

async function assertDiscardedReset(page) {
  await page.getByRole('alert').filter({ hasText: originalLinkHelp }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Solicitar un nuevo enlace' }).getAttribute('href'), recovery)
  assert.equal(await page.locator('input').count(), 0)
  assert.equal(await page.getByRole('heading', { name: success.mensaje }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Restablecer contraseña' }).count(), 0)
  assert.equal(await page.evaluate(() => location.hash), '')
}

async function scenario(browser, site, width, mode) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
  const page = await context.newPage()
  page.setDefaultTimeout(6500)
  const problems = []
  const calls = []
  let reply
  let release
  page.on('pageerror', () => problems.push('Error JavaScript en la página'))

  await context.route('**/*', async (route) => {
    const request = route.request()
    const { origin, pathname, search } = new URL(request.url())
    if (origin !== site) return route.abort()
    if (!pathname.startsWith('/api/')) return route.continue()
    calls.push(pathname)
    if (pathname === '/api/v1/auth/login') {
      return route.fulfill({ json: { token: 'jwt-simulado', tipo: 'Bearer', expiraEnSegundos: 1800 } })
    }
    if (pathname === '/api/v1/auth/me') {
      return route.fulfill({ json: { id: 7, correo: 'otra-cuenta@ejemplo.invalid', nombreVisible: 'Cuenta anterior', roles: ['USUARIO'] } })
    }
    if (pathname === '/api/v1/categorias') return route.fulfill({ json: [category] })
    if (pathname === '/api/v1/favoritos') return route.fulfill({ json: [] })
    if (pathname === '/api/v1/recetas') {
      const filters = new URLSearchParams(search)
      return route.fulfill({ json: {
        contenido: [recipe], pagina: Number(filters.get('pagina')), tamano: Number(filters.get('tamano')), totalElementos: 1, totalPaginas: 1,
      } })
    }
    if (pathname === '/api/v1/recetas/12') {
      const json = { ...recipe, porcionesSolicitadas: null, preparacion: 'Prueba local', ingredientes: [], multimedia: [] }
      return route.fulfill({ json })
    }
    if ([`/api/v1/auth${recovery}`, `/api/v1/auth${reset}`].includes(pathname)) {
      const recoveryPost = pathname.endsWith(recovery)
      const payload = request.postDataJSON()
      const expected = recoveryPost ? { correo: email } : { token: reply?.token ?? token, contrasena: password }
      if (JSON.stringify(payload) !== JSON.stringify(expected)) problems.push('Cuerpo de recuperación inesperado')
      if (request.method() !== 'POST' || search || request.headers().authorization || request.headers().cookie) {
        problems.push('Solicitud de recuperación no pública o con URL inesperada')
      }
      const options = reply
      options?.onRequest?.()
      if (options?.gate) await options.gate
      if (options?.network) return route.abort('connectionreset')
      try {
        await route.fulfill({ status: options?.status ?? 200, json: options?.json ?? (recoveryPost ? { mensaje: generic } : success) })
      } catch {
        if (!options?.allowCanceled) problems.push('No se pudo simular la respuesta HTTP')
      } finally {
        options?.onResolved?.()
      }
      return
    }
    return route.fulfill({ status: 404 })
  })

  const heading = (name) => page.getByRole('heading', { name, exact: true }).waitFor()
  const alert = (text) => page.getByRole('alert').filter({ hasText: text }).waitFor()
  const button = (name) => page.getByRole('button', { name, exact: true })
  const link = (name) => page.getByRole('link', { name, exact: true })
  const input = (name) => page.getByLabel(name, { exact: true })
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const fillReset = async (confirmation = password) => {
    await input('Nueva contraseña').fill(password)
    await input('Confirmar contraseña').fill(confirmation)
  }
  const openReset = async (hash = `#token=${token}`) => {
    await page.goto(`${site}${reset}${hash}`)
    await heading('Restablecer contraseña')
    assert.equal(page.url(), `${site}${reset}`)
    await noOverflow()
  }
  const noSecrets = async () => {
    const forbidden = [token, otherToken, password]
    const snapshot = await page.evaluate(async () => JSON.stringify({
      url: location.href, state: history.state, local: { ...localStorage }, session: { ...sessionStorage },
      cookies: document.cookie, dbs: await indexedDB.databases(),
      fields: [...document.querySelectorAll('input')].map(({ name, value }) => ({ name, value })),
      text: document.body.innerText,
    }))
    assert.ok(forbidden.every((secret) => !snapshot.includes(secret)))
  }
  const contrast = async (locator) => {
    assert.ok(await locator.evaluate((element) => {
      function luminance(color) {
        return color.match(/\d+/g).slice(0, 3).map((number) => {
          const c = Number(number) / 255
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
        }).reduce((total, c, i) => total + c * [0.2126, 0.7152, 0.0722][i], 0)
      }
      const front = luminance(getComputedStyle(element).color)
      let background = getComputedStyle(element).backgroundColor
      for (let parent = element.parentElement; background === 'rgba(0, 0, 0, 0)' && parent; parent = parent.parentElement) {
        background = getComputedStyle(parent).backgroundColor
      }
      const back = luminance(background)
      return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05) >= 4.5
    }), 'Contraste de texto normal inferior a 4.5:1')
  }

  try {
    await page.goto(`${site}/favoritos`)
    await page.getByRole('region', { name: 'Mis recetas favoritas' }).getByRole('link', { name: 'Iniciar sesión' }).click()
    await heading('Bienvenido de nuevo')
    assert.equal(await input('Contraseña').getAttribute('autocomplete'), 'current-password')
    await link('¿Olvidaste tu contraseña?').focus()
    await page.keyboard.press('Enter')
    await heading('Recuperar contraseña')
    assert.equal(await page.evaluate(() => history.state.usr.from), '/favoritos')
    await noOverflow()

    const requestButton = button('Solicitar recuperación')
    const mail = input('Correo electrónico')
    await contrast(requestButton)
    const before = calls.length
    await requestButton.click()
    assert.equal(await mail.getAttribute('aria-invalid'), 'true')
    assert.ok(await mail.evaluate((el) => el === document.activeElement))
    await contrast(page.getByText('Escribe tu correo electrónico.', { exact: true }))
    await mail.fill('formato-invalido')
    await requestButton.click()
    assert.equal(calls.length, before)
    await mail.fill(' Persona@Ejemplo.INVALID ')
    reply = { status: 503, json: { error: 'Recuperación temporalmente no disponible' } }
    await requestButton.click()
    await alert(unavailable)
    assert.equal(await page.getByText(generic, { exact: false }).count(), 0)
    await contrast(page.getByRole('alert').filter({ hasText: unavailable }))
    await noOverflow()
    reply = { status: 429, json: { error: 'Límite simulado' } }
    await requestButton.click()
    await alert(/demasiadas solicitudes.*Espera/)
    assert.equal(await page.getByText(generic, { exact: false }).count(), 0)
    reply = undefined
    await requestButton.click()
    await page.getByRole('status').filter({ hasText: /Si la cuenta existe.*disponibilidad/ }).waitFor()
    assert.equal(calls.length - before, 3)
    await noOverflow()
    await link('Regresar al inicio de sesión').click()
    await heading('Bienvenido de nuevo')
    assert.equal(await page.evaluate(() => history.state.usr.from), '/favoritos')

    await openReset()
    await noSecrets()
    const submit = button('Restablecer contraseña')
    await button('Mostrar contraseña').click()
    assert.equal(await input('Nueva contraseña').getAttribute('autocomplete'), 'new-password')
    assert.equal(await input('Nueva contraseña').getAttribute('type'), 'text')
    await button('Ocultar contraseña').click()
    await submit.click()
    assert.ok(await input('Nueva contraseña').evaluate((el) => el === document.activeElement))
    await fillReset('Distinta1!')
    await submit.click()
    assert.ok(await input('Confirmar contraseña').evaluate((el) => el === document.activeElement))
    reply = { status: 503, json: {} }
    await fillReset()
    await submit.click()
    await alert(unavailable)
    assert.equal(await submit.count(), 1)
    reply = { network: true }
    await fillReset()
    await submit.click()
    await alert(/Intenta iniciar sesión con la nueva contraseña o solicita otro enlace/)
    assert.equal(calls.filter((path) => path.endsWith(reset)).length, 2)
    await noOverflow()

    reply = { gate: new Promise((resolve) => { release = resolve }) }
    await fillReset()
    await submit.evaluate((element) => {
      element.form.requestSubmit()
      element.form.requestSubmit()
    })
    assert.ok(await button('Restableciendo contraseña…').isDisabled())
    const sent = page.waitForResponse((r) => r.url().endsWith(`/auth${reset}`) && r.ok())
    release()
    await sent
    await heading('Contraseña actualizada')
    await page.getByRole('status').filter({ hasText: /nueva contraseña/ }).waitFor()
    assert.equal(calls.filter((path) => path.endsWith(reset)).length, 3)
    assert.equal(await submit.count(), 0)
    await noSecrets()
    await noOverflow()

    const beforeRestore = calls.filter((path) => path === resetEndpoint).length
    const simulate = (type) => page.evaluate((event) => {
      dispatchEvent(new PageTransitionEvent(event, { persisted: true }))
    }, type)
    // Simula los eventos por separado: comprueba limpieza antes y después de restaurar, incluso tras éxito.
    await simulate('pagehide')
    await assertDiscardedReset(page)
    await simulate('pageshow')
    await assertDiscardedReset(page)

    await openReset()
    await fillReset()
    // Comprueba la defensa de pageshow cuando no se ejecutó pagehide en esta simulación.
    await simulate('pageshow')
    await assertDiscardedReset(page)
    await noSecrets()
    assert.equal(calls.filter((path) => path === resetEndpoint).length, beforeRestore)

    // El documento anterior y el que arranca tras la recarga comparten el historial, no el generador de claves.
    const previousKey = await page.evaluate(() => history.state.key)
    await page.reload()
    await assertDiscardedReset(page)
    assert.equal(await page.evaluate(() => history.state.key), previousKey)
    await page.evaluate((value) => { location.hash = `token=${value}` }, otherToken)
    await input('Nueva contraseña').waitFor()
    const nextKey = await page.evaluate(() => history.state.key)
    assert.notEqual(nextKey, previousKey)
    await page.goBack()
    await assertDiscardedReset(page)
    assert.equal(await page.evaluate(() => history.state.key), previousKey)
    await page.goForward()
    await assertDiscardedReset(page)
    assert.equal(await page.evaluate(() => history.state.key), nextKey)

    await openReset(`#token=${token}&token=${otherToken}`)
    await alert(/no tiene el formato esperado/)
    await noSecrets()
    // Navegación nativa dentro del documento: popstate/hashchange, sin recargar.
    await page.evaluate((value) => { location.hash = `token=${value}` }, otherToken)
    await input('Nueva contraseña').waitFor()
    assert.equal(page.url(), `${site}${reset}`)
    reply = { token: otherToken, status: 400, json: { error: 'Enlace inválido o vencido' } }
    await fillReset()
    await submit.click()
    await alert(/no es válido, ya se usó o venció/)
    assert.equal(await submit.count(), 0)
    await noOverflow()
    await link('Iniciar sesión').click()
    await heading('Bienvenido de nuevo')

    await openReset()
    const requested = Promise.withResolvers()
    const resolved = Promise.withResolvers()
    reply = { gate: new Promise((resolve) => { release = resolve }), onRequest: requested.resolve,
      onResolved: resolved.resolve, allowCanceled: true }
    await fillReset()
    await submit.click()
    await requested.promise
    await link('Iniciar sesión').click()
    await heading('Bienvenido de nuevo')
    release()
    await resolved.promise
    await page.goBack()
    await alert(/vuelve a abrir el enlace original/)
    assert.equal(page.url(), `${site}${reset}`)
    await noSecrets()
    await link('Iniciar sesión').click()
    await heading('Bienvenido de nuevo')

    // Una sesión posiblemente de otra cuenta se cierra solo aquí, no en el servidor.
    await input('Correo electrónico').fill('otra-cuenta@ejemplo.invalid')
    await input('Contraseña').fill(password)
    await button('Iniciar sesión').click()
    await page.getByRole('main').getByText('Cuenta anterior', { exact: true }).waitFor()
    await page.evaluate(({ path, value }) => {
      history.pushState(null, '', `${path}#token=${value}`)
      dispatchEvent(new PopStateEvent('popstate'))
    }, { path: reset, value: token })
    await heading('Restablecer contraseña')
    assert.equal(page.url(), `${site}${reset}`)
    reply = undefined
    await fillReset()
    await submit.click()
    await heading('Contraseña actualizada')
    await link('Iniciar sesión').click()
    await heading('Bienvenido de nuevo')
    await page.getByRole('status').filter({ hasText: /se cerró la sesión anterior solo en este navegador/ }).waitFor()
    assert.equal(calls.filter((path) => path.endsWith('/auth/login')).length, 1)
    assert.ok(!calls.includes('/api/v1/auth/logout'))
    assert.deepEqual(problems, [])
    if (mode === 'build' && width === 390) await checkNavigation(page, site)
    console.log(`Chromium ${mode}, ${width}px: recuperación, recarga, Atrás/Adelante, simulación BFCache y diseño responsive.`)
  } finally {
    release?.()
    await context.close()
  }
}

async function checkNavigation(page, site) {
  const catalog = `${site}/recetas?tipo=TRADICIONAL_OAXAQUENA&titulo=Mole`
  await page.goto(catalog)
  const title = page.getByLabel('Buscar por título')
  const type = page.getByRole('button', { name: 'Tradicionales', exact: true })
  const select = page.getByLabel('Categoría')
  await page.getByRole('option', { name: category.nombre, exact: true }).waitFor({ state: 'attached' })
  assert.equal(await type.getAttribute('aria-pressed'), 'true')
  assert.equal(await title.inputValue(), 'Mole')
  const withCategory = `${catalog}&categoria=2`
  const filteredRequest = page.waitForRequest((request) => {
    const { pathname, searchParams } = new URL(request.url())
    return pathname === '/api/v1/recetas' && searchParams.get('categoria') === '2' &&
      searchParams.get('titulo') === 'Mole' && searchParams.get('tipo') === 'TRADICIONAL_OAXAQUENA'
  })
  await select.selectOption('2')
  await filteredRequest
  await page.waitForURL(withCategory)
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await page.waitForURL(`${site}/recetas`)
  assert.equal(await title.inputValue(), '')
  await page.goBack()
  await page.waitForURL(withCategory)
  assert.equal(await title.inputValue(), 'Mole')
  assert.equal(await select.inputValue(), '2')
  assert.equal(await type.getAttribute('aria-pressed'), 'true')
  await page.goForward()
  await page.waitForURL(`${site}/recetas`)
  assert.equal(await select.inputValue(), '')
  await page.getByRole('link', { name: `Ver receta de ${recipe.titulo}` }).click()
  await page.getByRole('heading', { name: recipe.titulo, exact: true }).waitFor()
  await page.goBack()
  await page.getByRole('heading', { name: 'Explora recetas de Oaxaca' }).waitFor()
  await page.goForward()
  await page.getByRole('heading', { name: recipe.titulo, exact: true }).waitFor()

  const detail = `${site}/recetas/12?vista=qa#detalle`
  await page.goto(detail)
  await page.getByRole('link', { name: 'Reportar receta', exact: true }).click()
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click()
  await page.getByRole('link', { name: 'Regresar al inicio de sesión' }).click()
  await page.getByLabel('Correo electrónico').fill('otra-cuenta@ejemplo.invalid')
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL(detail)
  await page.getByRole('button', { name: 'Reportar receta', exact: true }).waitFor()
  console.log('Chromium: navegación normal, enlace directo, filtros, Atrás/Adelante y retorno exacto tras login verificados.')
}

async function checkRealBackForwardCache(browser, site) {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  context.setDefaultTimeout(6500)
  let posts = 0
  await context.addInitScript(() => {
    const record = { id: crypto.randomUUID(), hide: 0, show: 0 }
    window.__qaCache = record
    window.addEventListener('pagehide', (event) => { if (event.isTrusted && event.persisted) record.hide++ })
    window.addEventListener('pageshow', (event) => { if (event.isTrusted && event.persisted) record.show++ })
  })
  await context.route('**/*', (route) => {
    const { origin, pathname } = new URL(route.request().url())
    if (origin !== site) return route.abort()
    if (pathname === resetEndpoint && route.request().method() === 'POST') {
      posts++
      return route.fulfill({ json: success })
    }
    if (pathname.startsWith('/api/')) return route.fulfill({ status: 404 })
    return route.continue()
  })

  try {
    for (const completed of [false, true]) {
      const page = await context.newPage()
      await page.goto(`${site}${reset}#token=${token}`)
      await page.getByLabel('Nueva contraseña', { exact: true }).fill(password)
      await page.getByLabel('Confirmar contraseña', { exact: true }).fill(password)
      if (completed) {
        await page.getByRole('button', { name: 'Restablecer contraseña' }).click()
        await page.getByRole('heading', { name: success.mensaje }).waitFor()
      }
      const before = await page.evaluate(() => window.__qaCache.id)
      await page.goto(`${site}/login`)
      assert.notEqual(await page.evaluate(() => window.__qaCache.id), before)
      await page.goBack({ waitUntil: 'commit' })
      await page.waitForFunction((id) => window.__qaCache?.id === id && window.__qaCache.hide === 1 && window.__qaCache.show === 1, before)
      await assertDiscardedReset(page)
      assert.equal(posts, Number(completed))
      await page.close()
    }
    console.log('Chromium: BFCache real confirmado por pagehide/pageshow confiables con persisted=true; sin campos, éxito anterior ni nuevos POST.')
  } finally {
    await context.close()
  }
}

const serverOptions = { host: '127.0.0.1', port: 0, proxy: {} }
const previewServer = await preview({ configFile: false, root, preview: serverOptions })
let devServer
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'] })
  const site = `http://127.0.0.1:${previewServer.httpServer.address().port}`
  for (const width of [320, 390, 768, 1440]) await scenario(browser, site, width, 'build')
  await checkRealBackForwardCache(browser, site)

  devServer = await createServer({ configFile: false, root, plugins: [react()],
    server: { ...serverOptions, hmr: false, ws: false } })
  await devServer.listen()
  await scenario(browser, `http://127.0.0.1:${devServer.httpServer.address().port}`, 390, 'StrictMode dev')
} finally {
  await browser?.close()
  await devServer?.close()
  await new Promise((resolve) => previewServer.httpServer.close(resolve))
}
