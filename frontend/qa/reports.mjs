import assert from 'node:assert/strict'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { preview } from 'vite'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const server = await preview({
  configFile: false,
  root: fileURLToPath(new URL('..', import.meta.url)),
  preview: { host: '127.0.0.1', port: 0, proxy: {} },
})
const site = `http://127.0.0.1:${server.httpServer.address().port}`
const moderation = '/moderacion/reportes'
const date = '2026-11-24T12:00:00'
const reason = '<b>Esto es texto</b> ' + 'x'.repeat(430)
const accounts = {
  reader: { id: 1, nombreVisible: 'Ana', correo: 'ana@example.invalid', roles: ['USUARIO'] },
  moderator: { id: 2, nombreVisible: 'Ana', correo: 'revision@example.invalid', roles: ['MODERADOR'] },
  author: { id: 3, nombreVisible: 'Cocinera', correo: 'autora@example.invalid', roles: ['COCINERO'] },
}
const recipe = {
  id: 12, titulo: 'Mole de prueba', descripcion: 'Receta para HTTP simulado', tipo: 'COMUN', porcionesBase: 4,
  autor: { id: accounts.author.id, nombreVisible: accounts.author.nombreVisible }, categorias: [],
}
const detail = { ...recipe, preparacion: 'Preparar el mole.', porcionesSolicitadas: null, ingredientes: [], multimedia: [] }

const button = (page, name) => page.getByRole('button', { name, exact: true })
const link = (page, name) => page.getByRole('link', { name, exact: true })
const heading = (page, name) => page.getByRole('heading', { name, exact: true }).waitFor()
const text = (page, value) => page.getByText(value, { exact: true }).waitFor()
const noOverflow = async (page, width) => assert.equal(await page.evaluate(() =>
  document.documentElement.scrollWidth <= window.innerWidth), true, `Sin desbordamiento a ${width} px`)

async function login(page, account) {
  await heading(page, 'Bienvenido de nuevo')
  await page.getByLabel('Correo electrónico').fill(account.correo)
  await page.getByLabel('Contraseña', { exact: true }).fill('Solo-Pruebas_123')
  await button(page, 'Iniciar sesión').click()
}

async function scenario(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
  context.setDefaultTimeout(6000)
  const errors = []
  const calls = []
  const reports = []
  const favoriteIds = new Set([recipe.id])
  let publicRecipe = true
  let uncertainCreation = false
  let listFail = false
  const pending = (row) => ['ABIERTO', 'EN_REVISION'].includes(row.estado)
  const postCount = () => calls.filter(({ path, method }) => path === '/recetas/12/reportes' && method === 'POST').length
  context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)))
  await context.route('**/*', async (route) => {
    const request = route.request()
    const { origin, pathname, searchParams } = new URL(request.url())
    if (origin !== site) return route.abort()
    if (!pathname.startsWith('/api/')) return route.continue()
    const path = pathname.replace('/api/v1', '')
    const method = request.method()
    const headers = request.headers()
    const account = accounts[headers.authorization?.replace(/^Bearer /u, '')]
    const send = (status, json) => route.fulfill(json === undefined ? { status } : { status, json })
    const paginate = (list) => {
      const pagina = Number(searchParams.get('pagina'))
      const tamano = Number(searchParams.get('tamano'))
      return { contenido: list.slice(pagina * tamano, (pagina + 1) * tamano), pagina, tamano,
        totalElementos: list.length, totalPaginas: Math.ceil(list.length / tamano) }
    }
    calls.push({ path, method, searchParams, account: account?.id })

    if (path === '/auth/login') {
      const token = Object.keys(accounts).find((key) => accounts[key].correo === request.postDataJSON().correo)
      return token ? send(200, { token, tipo: 'Bearer', expiraEnSegundos: 1800 }) : send(401)
    }
    if (path === '/auth/me') return account ? send(200, account) : send(401)
    if (path === '/categorias') return send(200, [])
    if (path === '/favoritos' && method === 'GET') return account ? send(200, publicRecipe && favoriteIds.has(12) ? [recipe] : []) : send(401)
    if (path === '/recetas' && method === 'GET') return send(200, paginate(publicRecipe ? [recipe] : []))
    if (path === '/recetas/12' && method === 'GET') return publicRecipe ? send(200, detail) : send(404)
    if (path === '/recetas/12/reportes' && method === 'POST') {
      if (!account) return send(401)
      if (!publicRecipe) return send(404)
      if (account.id === recipe.autor.id) return send(403)
      if (reports.some(pending)) return send(409)
      if (uncertainCreation) {
        uncertainCreation = false
        return route.abort('connectionreset')
      }
      const { motivo } = request.postDataJSON()
      if (JSON.stringify(request.postDataJSON()) !== JSON.stringify({ motivo }) || !motivo?.trim() || motivo.length > 500) {
        errors.push('Cuerpo de creación no válido')
        return send(400)
      }
      const row = { id: 7 + reports.length, recetaId: 12, motivo, estado: 'ABIERTO', creadoEn: date }
      reports.push({ ...row, titulo: recipe.titulo, reportante: account.nombreVisible, resueltoEn: null })
      return send(201, row)
    }
    if (path.startsWith(moderation)) {
      if (!account) return send(401)
      if (!account.roles.some((role) => ['ADMIN', 'MODERADOR'].includes(role))) return send(403)
      if (path === moderation && method === 'GET') {
        if (listFail) {
          listFail = false
          return send(500)
        }
        const state = searchParams.get('estado')
        return send(200, paginate(reports.filter((row) => !state || row.estado === state)))
      }
      const [, id, action] = /\/(\d+)(?:\/([^/]+))?$/u.exec(path) ?? []
      const row = reports.find((value) => String(value.id) === id)
      if (!row) return send(404)
      if (method === 'GET' && !action) return send(200, row)
      if (method === 'POST' && ['descartar', 'dar-baja'].includes(action)) {
        if (request.postData() !== null || headers['if-match'] || headers['content-type']) errors.push('La decisión no admite cuerpo ni If-Match')
        if (!pending(row) || (action === 'dar-baja' && !publicRecipe)) return send(409)
        const resolve = (report, estado) => Object.assign(report, { estado, resueltoEn: date })
        if (action === 'descartar') resolve(row, 'DESCARTADO')
        else {
          publicRecipe = false
          reports.filter(pending).forEach((report) => resolve(report, 'RESUELTO'))
        }
        return send(200, row)
      }
    }
    errors.push(`HTTP inesperado: ${method} ${path}`)
    return send(404)
  })

  try {
    const reader = await context.newPage()
    await reader.goto(`${site}/recetas/12`)
    await link(reader, 'Reportar receta').click()
    await login(reader, accounts.reader)
    await reader.waitForURL('**/recetas/12')
    const field = reader.getByLabel('Motivo del reporte')
    await button(reader, 'Reportar receta').click()
    await button(reader, 'Revisar envío').click()
    await text(reader, 'Escribe el motivo del reporte.')
    assert.equal(await field.getAttribute('aria-invalid'), 'true')
    await field.fill('  ')
    await button(reader, 'Revisar envío').click()
    await text(reader, 'Escribe el motivo del reporte.')
    await field.fill(reason)
    await text(reader, `${reason.length} de 500 caracteres`)
    await button(reader, 'Revisar envío').click()
    await heading(reader, '¿Enviar este reporte a moderación?')
    await noOverflow(reader, width)
    await button(reader, 'Cancelar reporte').click()
    assert.equal(postCount(), 0)
    await button(reader, 'Reportar receta').click()
    await field.fill(reason)
    await button(reader, 'Revisar envío').click()
    await button(reader, 'Confirmar envío').click()
    await text(reader, 'Reporte enviado correctamente.')
    await button(reader, 'Reportar receta').click()
    await field.fill('Intento duplicado')
    await button(reader, 'Revisar envío').click()
    await button(reader, 'Confirmar envío').click()
    await text(reader, 'Ya existe un reporte pendiente tuyo para esta receta.')
    assert.equal(await field.inputValue(), 'Intento duplicado')

    const author = await context.newPage()
    await author.goto(`${site}/recetas/12`)
    await link(author, 'Reportar receta').click()
    await login(author, accounts.author)
    await text(author, 'No puedes reportar tu propia receta.')
    assert.equal(await button(author, 'Reportar receta').count(), 0)

    const moderator = await context.newPage()
    await moderator.goto(`${site}/moderador/reportes/7`)
    await login(moderator, accounts.moderator)
    await moderator.waitForURL('**/moderador/reportes/7')
    await text(moderator, reason)
    assert.equal(await moderator.locator('dd b').count(), 0)
    await link(moderator, 'Ver receta pública').waitFor()
    await button(moderator, 'Descartar reporte').click()
    await text(moderator, 'El reporte quedará descartado. La receta no cambiará.')
    await noOverflow(moderator, width)
    await button(moderator, 'Cancelar').click()
    assert.equal(reports[0].estado, 'ABIERTO')
    await button(moderator, 'Descartar reporte').click()
    await button(moderator, 'Confirmar descarte').click()
    await text(moderator, 'Decisión registrada: Descartado.')
    assert.equal(await button(moderator, 'Descartar reporte').count(), 0)
    assert.equal(publicRecipe, true)
    listFail = true
    await link(moderator, '← Volver a Reportes').click()
    await moderator.getByRole('alert').waitFor()
    await button(moderator, 'Reintentar').click()
    await text(moderator, 'No hay reportes con este filtro.')
    const filter = moderator.getByLabel('Filtrar por estado')
    await filter.selectOption('DESCARTADO')
    await link(moderator, 'Ver reporte 7').waitFor()
    await noOverflow(moderator, width)

    // En la misma sesión, el motivo se conserva sin reenvío automático si se corta la conexión.
    uncertainCreation = true
    await field.fill('Nuevo reporte después del descarte')
    await button(reader, 'Revisar envío').click()
    await button(reader, 'Confirmar envío').click()
    await reader.getByRole('alert').filter({ hasText: 'No se pudo confirmar el envío' }).waitFor()
    assert.equal(postCount(), 3)
    assert.equal(await field.inputValue(), 'Nuevo reporte después del descarte')
    await button(reader, 'Revisar envío').click()
    await button(reader, 'Confirmar envío').click()
    await text(reader, 'Reporte enviado correctamente.')
    await link(reader, 'Favoritos').last().click()
    await heading(reader, recipe.titulo)

    reports.push({ ...reports[1], id: 9, estado: 'EN_REVISION', reportante: 'Otra cuenta' })
    await filter.selectOption('EN_REVISION')
    await link(moderator, 'Ver reporte 9').waitFor()
    await filter.selectOption('ABIERTO')
    await link(moderator, 'Ver reporte 8').click()
    await button(moderator, 'Dar de baja receta').click()
    await moderator.getByRole('group', { name: '¿Confirmar: Dar de baja receta?' }).waitFor()
    await noOverflow(moderator, width)
    await button(moderator, 'Confirmar baja').click()
    await text(moderator, 'Decisión registrada: Resuelto.')
    await text(moderator, 'La receta no está disponible en el catálogo público.')
    await link(moderator, '← Volver a Reportes').click()
    await filter.selectOption('RESUELTO')
    await link(moderator, 'Ver reporte 9').waitFor()

    await link(reader, 'Explorar el catálogo').click()
    await heading(reader, 'No encontramos recetas')
    await link(reader, 'Favoritos').last().click()
    await text(reader, 'Aún no tienes recetas favoritas.')
    assert.equal(favoriteIds.has(12), true)
    await reader.goto(`${site}/recetas/12`)
    await heading(reader, 'Receta no encontrada')
    assert.equal(calls.filter(({ method, path }) => method !== 'GET' && !path.startsWith('/auth/')).length, 6)
    assert.equal(calls.filter(({ path }) => path === moderation).every(({ searchParams }) =>
      searchParams.get('tamano') === '12' && searchParams.get('pagina') === '0'), true)
    assert.deepEqual(errors, [])
    console.log(`Chromium ${width}px: reporte, duplicado, descarte, reenvío explícito, baja, catálogo y favoritos verificados.`)
  } finally {
    await context.close()
  }
}

let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const width of [320, 390, 768, 1440]) await scenario(browser, width)
} finally {
  await browser?.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
