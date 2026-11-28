import assert from 'node:assert/strict'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { preview } from 'vite'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const server = await preview({
  configFile: false,
  root: fileURLToPath(new URL('..', import.meta.url)),
  preview: { host: '127.0.0.1', port: 0, proxy: {} },
})
const site = `http://127.0.0.1:${server.httpServer.address().port}`
const base = '/api/v1/admin/usuarios'
const admin = { id: 1, nombreVisible: 'Admin de prueba', correo: 'admin@example.invalid', roles: ['ADMIN'] }
const anaEmail = 'ana@example.invalid'
const password = 'Solo-Pruebas_123'
let browser

async function scenario(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
  const page = await context.newPage()
  page.setDefaultTimeout(6000)
  const errors = []
  const calls = []
  const created = '2026-01-01T12:00:00'
  const fillers = Array.from({ length: 20 }, (_, i) => ({
    id: i + 2, nombreVisible: `Cuenta ${i + 1}`, correo: `cuenta${i + 1}@example.invalid`,
    activo: i !== 0, roles: ['USUARIO'], creadoEn: created,
  }))
  let account
  let listUnavailable = true
  let afterWriteFailure = false
  let conflictNext = false
  let releasePut
  const putGate = new Promise((resolve) => { releasePut = resolve })
  page.on('pageerror', (error) => errors.push(error.message))
  await context.route('**/*', async (route) => {
    const request = route.request()
    const { origin, pathname, searchParams } = new URL(request.url())
    if (origin !== site) return route.abort()
    if (!pathname.startsWith('/api/')) return route.continue()
    const method = request.method()
    const isAdmin = request.headers().authorization === 'Bearer admin-simulado'
    const isUser = request.headers().authorization === 'Bearer usuario-simulado'
    const send = (status, json) => route.fulfill(json === undefined ? { status } : { status, json })
    calls.push({ pathname, method, searchParams })
    if (pathname.endsWith('/auth/registro')) {
      const { nombreVisible, correo } = request.postDataJSON()
      account = { id: 22, nombreVisible, correo, roles: ['USUARIO'], activo: true, creadoEn: created }
      return send(201, { id: account.id, nombreVisible, correo })
    }
    if (pathname.endsWith('/auth/login')) {
      const email = request.postDataJSON().correo
      if (![admin.correo, account?.correo].includes(email)) return send(401)
      return send(200, { token: email === admin.correo ? 'admin-simulado' : 'usuario-simulado', tipo: 'Bearer', expiraEnSegundos: 1800 })
    }
    if (pathname.endsWith('/auth/me')) return isAdmin || isUser ? send(200, isAdmin ? admin : account) : send(401)
    if (pathname.endsWith('/auth/logout')) return send(204)
    if (pathname === '/api/v1/mis-recetas') return send(200, { contenido: [], pagina: 0, tamano: 12, totalElementos: 0, totalPaginas: 0 })
    if (pathname.startsWith(base) && !isAdmin) return send(isUser ? 403 : 401)
    if (pathname === base) {
      if (listUnavailable) {
        listUnavailable = false
        return send(500)
      }
      const pagina = Number(searchParams.get('pagina'))
      const texto = searchParams.get('texto')?.toLowerCase() ?? ''
      const rol = searchParams.get('rol')
      const activo = searchParams.get('activo')
      const rows = [{ ...admin, activo: true, creadoEn: created }, ...fillers, account].filter((row) =>
        (row.nombreVisible.toLowerCase().includes(texto) || row.correo.includes(texto))
        && (!rol || row.roles.includes(rol)) && (activo === null || String(row.activo) === activo))
      return send(200, { contenido: rows.slice(pagina * 20, (pagina + 1) * 20), pagina, tamano: 20,
        totalElementos: rows.length, totalPaginas: Math.ceil(rows.length / 20) })
    }
    if (pathname === `${base}/2`) return send(200, fillers[0])
    if (pathname === `${base}/22`) {
      if (afterWriteFailure) {
        afterWriteFailure = false
        return send(500)
      }
      return send(200, account)
    }
    if (pathname === `${base}/22/roles/cocinero`) {
      if (request.postData() !== null || request.headers()['content-type']) errors.push('La escritura no debe enviar cuerpo ni tipo de contenido')
      if (method === 'PUT') {
        await putGate
        account.roles = ['USUARIO', 'COCINERO']
        afterWriteFailure = true
        return send(204)
      }
      if (method === 'DELETE') {
        account.roles = ['USUARIO']
        return route.abort('connectionreset')
      }
    }
    if (pathname === `${base}/22/roles/moderador`) {
      if (conflictNext) { conflictNext = false; return send(409, { codigo: 'CUENTA_INACTIVA', error: 'SQL privado' }) }
      account.roles = method === 'PUT' ? [...account.roles, 'MODERADOR'] : account.roles.filter((role) => role !== 'MODERADOR')
      return send(204)
    }
    if (pathname === `${base}/22/desactivar` || pathname === `${base}/22/reactivar`) {
      account.activo = pathname.endsWith('/reactivar')
      return send(204)
    }
    if (pathname.startsWith(base)) return send(404)
    return send(404)
  })

  const heading = (name) => page.getByRole('heading', { name, exact: true }).waitFor()
  const button = (name) => page.getByRole('button', { name, exact: true })
  const link = (name) => page.getByRole('link', { name, exact: true })
  const myRecipes = () => page.getByRole('region', { name: 'Mi perfil' }).getByRole('link', { name: 'Mis recetas', exact: true })
  const writes = () => calls.filter(({ method, pathname }) => pathname.startsWith(base) && method !== 'GET')
  const login = async (email) => {
    await heading('Bienvenido de nuevo')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    await button('Iniciar sesión').click()
  }
  const noOverflow = async () => assert.equal(await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth), true, `Sin desbordamiento a ${width} px`)

  try {
    await page.goto(`${site}/admin/usuarios`)
    await page.waitForURL('**/login')
    await link('Crear cuenta nueva').click()
    await page.getByLabel('Nombre visible').fill('Ana de prueba')
    await page.getByLabel('Correo electrónico').fill(anaEmail)
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    await page.getByLabel('Confirmar contraseña').fill(password)
    await button('Crear mi cuenta').click()
    await heading('Cuenta creada')
    await link('Iniciar sesión').click()
    await login(anaEmail)
    await page.waitForURL('**/admin/usuarios')
    await heading('Acceso denegado')
    assert.equal(calls.some(({ pathname }) => pathname.startsWith(base)), false)
    await link('Volver a mi perfil').click()
    assert.equal(await link('Panel de administración').count(), 0)
    await myRecipes().click()
    await page.getByText(/Modo lectura/u).waitFor()
    assert.equal(await link('Crear receta').count(), 0)

    await page.goto(`${site}/login`)
    await login(admin.correo)
    await heading('Mi perfil')
    await link('Panel de administración').click()
    await heading('Administración de usuarios')
    await page.getByRole('alert').filter({ hasText: 'El servidor no pudo completar la solicitud.' }).waitFor()
    await button('Reintentar').click()
    await page.getByText('22 cuentas encontradas. Página 1 de 2.').waitFor()
    await noOverflow()
    await link('Ver detalle de Cuenta 1').click()
    await heading('Cuenta 1')
    await page.getByText('No se pueden cambiar los roles de una cuenta inactiva.').waitFor()
    assert.equal(await button('Asignar rol COCINERO').count(), 0)
    await link('← Volver a usuarios').click()
    await button('Siguiente').click()
    await page.getByText('22 cuentas encontradas. Página 2 de 2.').waitFor()
    await page.getByRole('searchbox').fill(anaEmail)
    await page.getByText('1 cuenta encontrada. Página 1 de 1.').waitFor()
    await page.getByLabel('Rol asignado').selectOption('ADMIN')
    await page.getByText('No hay cuentas que coincidan con estos filtros.').waitFor()
    await page.getByLabel('Rol asignado').selectOption('USUARIO')
    await page.getByLabel('Estado de cuenta').selectOption('true')
    await link('Ver detalle de Ana de prueba').click()
    assert.ok(calls.some(({ searchParams }) => searchParams.get('texto') === anaEmail
      && searchParams.get('activo') === 'true' && searchParams.get('rol') === 'USUARIO'
      && searchParams.get('pagina') === '0' && searchParams.get('tamano') === '20'))
    await heading('Ana de prueba')
    await page.getByText('Fecha de registro (UTC)').waitFor()
    await noOverflow()
    await button('Asignar rol COCINERO').click()
    await button('Cancelar').click()
    assert.equal(writes().length, 0)
    await button('Asignar rol COCINERO').click()
    await noOverflow()
    await button('Confirmar cambio').click()
    await page.getByText(/Enviando el cambio/u).waitFor()
    assert.equal(await button('Asignar rol COCINERO').isDisabled(), true)
    assert.equal(await button('Retirar rol COCINERO').count(), 0)
    releasePut()
    await page.getByText(/El servidor confirmó.*actualización visual está pendiente/u).waitFor()
    assert.equal(await button('Retirar rol COCINERO').count(), 0)
    await button('Consultar estado actual').click()
    await button('Retirar rol COCINERO').waitFor()

    await page.goto(`${site}/login`)
    await login(anaEmail)
    await myRecipes().click()
    await link('Crear receta').waitFor()
    await page.goto(`${site}/admin/usuarios/22`)
    await login(admin.correo)
    await page.waitForURL('**/admin/usuarios/22')
    await button('Retirar rol COCINERO').click()
    await button('Confirmar cambio').click()
    await page.getByText(/No se pudo confirmar.*Se consultó el estado actual/u).waitFor()
    await button('Asignar rol COCINERO').waitFor()

    conflictNext = true
    await button('Asignar rol MODERADOR').click()
    await button('Confirmar cambio').click()
    await page.getByText(/La cuenta está inactiva; reactívala antes de cambiar sus roles/).waitFor()
    assert.equal(await page.getByText('SQL privado').count(), 0)
    await button('Asignar rol MODERADOR').waitFor()

    for (const label of ['Asignar rol MODERADOR', 'Retirar rol MODERADOR', 'Desactivar cuenta', 'Reactivar cuenta']) {
      const before = writes().length
      await button(label).click()
      await button('Cancelar').click()
      assert.equal(writes().length, before)
      await button(label).click()
      await button('Confirmar cambio').click()
      await page.getByText(/El servidor confirmó.*Se consultó el estado actual/u).waitFor()
      assert.equal(writes().length, before + 1)
    }
    await button('Asignar rol MODERADOR').waitFor()
    await button('Desactivar cuenta').waitFor()

    await page.goto(`${site}/login`)
    await login(anaEmail)
    await myRecipes().click()
    await page.getByText(/Modo lectura/u).waitFor()
    assert.equal(await link('Crear receta').count(), 0)
    assert.deepEqual(writes().map(({ method }) => method), ['PUT', 'DELETE', 'PUT', 'PUT', 'DELETE', 'POST', 'POST'])
    assert.deepEqual(errors, [])
    console.log(`Chromium ${width}px: registro, permisos, paginación, confirmación, reconsulta y retiro verificados.`)
  } finally {
    releasePut()
    await context.close()
  }
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const width of [320, 390, 1440]) await scenario(width)
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
