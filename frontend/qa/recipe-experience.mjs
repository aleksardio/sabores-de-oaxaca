import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

// Ejecutar con Vite local y PLAYWRIGHT_MODULE apuntando a playwright-core/index.mjs.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
const site = 'http://127.0.0.1:4177'
const media = 'https://media.saboresdeoaxaca.food'
const mockEmail = 'prueba@example.invalid'
const category = { id: 1, nombre: 'Tradición', descripcion: null }
const ingredient = { id: 35, nombre: 'Maíz' }
const ingredients = [ingredient, { id: 36, nombre: 'Sal' }, { id: 37, nombre: 'Ajonjolí' }]
const summary = (id) => ({
  id, titulo: `Mole ${id}`, descripcion: 'Mole de la comunidad', porcionesBase: 4,
  tipo: 'COMUN', autor: { id: 13, nombreVisible: 'Cocinera de prueba' }, categorias: [category],
})
const videoRow = (id, path, label) => ({
  id, tipo: 'VIDEO', orden: id, url: path.startsWith('/') ? media + path : path, textoAlternativo: label,
})
const videos = [
  videoRow(5, '/bueno.mp4', 'MP4'),
  videoRow(6, '/bueno.webm', 'WebM'),
  videoRow(7, '/fallo.mp4', 'Video con error'),
  videoRow(8, 'https://externo.example/video.mp4', 'Video externo'),
  videoRow(9, '/redirige.mp4', 'Video redirigido'),
]
const image = (id) => ({ id, tipo: 'IMAGEN', orden: 1, url: `${media}/${id}.jpg`, textoAlternativo: `Foto ${id}` })
const publicDetail = (id) => ({
  ...summary(id), porcionesSolicitadas: null, preparacion: 'Mezclar', ingredientes: [],
  multimedia: id === 1 ? [image(id), ...videos] : id === 3 || id > 4 ? [image(id)] : [],
})
const privateDetail = {
  ...summary(21), categorias: [], ingredientes: [], multimedia: videos, preparacion: 'Mezclar',
  estado: 'RECHAZADA', version: 4, eliminadoEn: null,
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })

function makeMedia() {
  const sample = (...options) => execFileSync(process.env.FFMPEG_EXECUTABLE || 'ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0xc15230:s=64x48:r=10:d=1',
    ...options, 'pipe:1',
  ])
  return {
    jpg: sample('-frames:v', '1', '-f', 'mjpeg'),
    mp4: sample('-c:v', 'libx264', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4'),
    webm: sample('-c:v', 'libvpx', '-f', 'webm'),
  }
}

async function scenario(width, roles, files, run) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
  const calls = []
  const unexpected = []
  const page = await context.newPage()
  page.setDefaultTimeout(6000)
  page.on('pageerror', (error) => unexpected.push(error.message))
  let favorites = [summary(1)]
  await context.route('**/*', async (route) => {
    const request = route.request()
    const { origin, pathname, searchParams } = new URL(request.url())
    const method = request.method()
    if (origin === media) {
      const extension = pathname.split('.').at(-1)
      if (pathname === '/redirige.mp4') {
        return route.fulfill({ status: 302, headers: { location: 'https://externo.example/redireccion.mp4' } })
      }
      if (['/1.jpg', '/5.jpg', '/bueno.mp4', '/bueno.webm', '/subido.webm'].includes(pathname)) {
        const contentType = extension === 'jpg' ? 'image/jpeg' : `video/${extension}`
        const file = files[extension]
        const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers().range || '')
        const start = Number(range?.[1] ?? 0)
        const end = Math.min(Number(range?.[2] || file.length - 1), file.length - 1)
        return route.fulfill({
          status: range ? 206 : 200, contentType, body: file.subarray(start, end + 1),
          headers: {
            'accept-ranges': 'bytes',
            ...(range && { 'content-range': `bytes ${start}-${end}/${file.length}` }),
          },
        })
      }
      return route.fulfill({ status: 404 })
    }
    if (origin !== site) {
      if (pathname === '/redireccion.mp4') unexpected.push('Se intentó cargar un video redirigido a otro origen')
      return route.abort()
    }
    if (!pathname.startsWith('/api/')) return route.continue()
    const path = pathname.replace('/api/v1', '')
    calls.push({ path, method, headers: request.headers(), body: request.postData() })
    const json = (value, status = 200) => route.fulfill({ status, json: value })
    if (path === '/auth/login' && method === 'POST') return json({ token: 'mock-jwt', tipo: 'Bearer', expiraEnSegundos: 3600 })
    if (path === '/auth/me' && method === 'GET') return json({ id: 13, nombreVisible: 'Cuenta simulada', correo: mockEmail, roles })
    if (path === '/categorias' && method === 'GET') return json([category])
    if (path === '/ingredientes' && method === 'GET') return json(ingredients)
    if (path === '/favoritos' && method === 'GET') return json(favorites)
    if (path === '/favoritos/1' && method === 'DELETE') {
      favorites = []
      return route.fulfill({ status: 204 })
    }
    if (path === '/recetas' && method === 'GET') {
      const pagina = Number(searchParams.get('pagina'))
      const tamano = Number(searchParams.get('tamano'))
      const filtered = searchParams.has('tipo') || pagina > 0
      return json({ contenido: (filtered ? [5] : [1, 2, 3, 4].slice(0, tamano)).map(summary), pagina, tamano, totalPaginas: 2, totalElementos: 5 })
    }
    if (/^\/recetas\/\d+$/.test(path) && method === 'GET') {
      const id = Number(path.split('/').at(-1))
      return id === 4 ? json({}, 404) : json(publicDetail(id))
    }
    if (path === '/mis-recetas/21' && method === 'GET') return json(privateDetail)
    if (path === '/mis-recetas/21' && method === 'PUT') return json({ id: 21, version: 5, estado: 'RECHAZADA' })
    if (path === '/mis-recetas/21/enviar-revision' && method === 'POST') return json({ id: 21, version: 6, estado: 'PENDIENTE' })
    if (path === '/multimedia/uploads' && method === 'POST') {
      return json({ tipo: 'VIDEO', url: `${media}/subido.webm`, nombreOriginal: 'prueba.webm', tamanoBytes: files.webm.length }, 201)
    }
    if (path === '/moderacion/recetas/21' && method === 'GET') {
      return json({ ...privateDetail, estado: 'PENDIENTE', autor: 'Autora diferente', autorId: 22 })
    }
    unexpected.push(`${method} ${pathname}`)
    return route.abort()
  })
  try {
    await page.goto(site)
    await run(page, calls)
    assert.deepEqual(unexpected, [])
  } finally {
    await context.close()
  }
}

const share = (page, navbar = false) => page.getByRole('link', { name: navbar ? 'Compartir receta' : 'Compartir mi receta', exact: true })
const action = (page, name) => page.getByRole('button', { name, exact: true })
const go = (page, path) => page.evaluate((value) => {
  history.pushState(null, '', value)
  dispatchEvent(new PopStateEvent('popstate'))
}, path)
const fit = async (page, label) => {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Desbordamiento: ${label}`)
}
const focusOn = (page, id) => page.waitForFunction((value) => document.activeElement.id === value, id)

async function login(page) {
  await page.waitForURL('**/login')
  await page.getByLabel('Correo electrónico').fill(mockEmail)
  await page.getByLabel('Contraseña', { exact: true }).fill('SoloPrueba!123')
  await action(page, 'Iniciar sesión').click()
}

async function checkWidth(page, calls, files) {
  await page.locator('.featured-card__photo[alt="Foto 1"]').waitFor()
  await page.waitForFunction(() => document.querySelector('.featured-card__photo')?.naturalWidth > 0)
  assert.equal(await share(page, true).getAttribute('href'), '/login')
  await fit(page, 'Inicio')
  await page.getByRole('link', { name: 'Explorar recetas', exact: true }).click()
  const cards = page.locator('.catalog-grid .featured-card')
  await cards.nth(3).waitFor()
  await page.locator('.catalog-grid img[alt="Foto 1"]').waitFor()
  await cards.nth(2).scrollIntoViewIfNeeded()
  await cards.nth(2).locator('.dish-art').waitFor()
  assert.equal(await cards.nth(1).locator('.dish-art').count(), 1)
  assert.equal(await cards.nth(3).locator('.dish-art').count(), 1)
  await fit(page, 'Catálogo')
  await action(page, 'Siguiente').click()
  await page.locator('.catalog-grid img[alt="Foto 5"]').waitFor()
  assert.equal(await cards.count(), 1)
  await action(page, 'Tradicionales').click()
  await page.locator('.catalog-grid img[alt="Foto 5"]').waitFor()
  await go(page, '/tradiciones')
  await page.getByRole('heading', { name: 'Las ocho regiones de Oaxaca' }).waitFor()
  await fit(page, 'Tradiciones')
  await go(page, '/recetas/1')
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.recipe-video [role="status"]'))
    .filter(({ textContent }) => textContent === 'No se pudo reproducir el video.').length === 2)
  assert.equal(await page.locator('video').count(), 2)
  for (const type of ['MP4', 'WebM']) {
    const player = page.locator(`video[aria-label="${type}"]`)
    await player.evaluate((video) => { video.muted = true })
    await player.evaluate((video) => video.play())
    await page.waitForFunction((label) => document.querySelector(`video[aria-label="${label}"]`).currentTime > 0, type)
    await player.evaluate((video) => video.pause())
  }
  assert.equal(await page.getByRole('link', { name: /Video externo/ }).getAttribute('href'), 'https://externo.example/video.mp4')
  await page.getByRole('link', { name: /Video con error/ }).waitFor()
  await fit(page, 'Detalle público')
  await go(page, '/')
  await share(page).click()
  await login(page)
  await page.waitForURL('**/cocinero/recetas/nueva')
  await page.getByRole('heading', { name: 'Crear receta' }).waitFor()
  await fit(page, 'Editor nuevo')

  await go(page, '/cocinero/recetas/21/editar')
  const save = action(page, 'Guardar cambios')
  const review = action(page, 'Reenviar a revisión')
  await review.waitFor()
  await page.getByText(/Requisitos adicionales para revisión/).waitFor()
  await review.click()
  await page.waitForFunction(() => document.activeElement.type === 'checkbox')
  const servings = page.getByLabel('Porciones base')
  await servings.fill('dos')
  await servings.press('Tab')
  await page.getByText(/entero positivo válido/).waitFor()
  assert.equal(await servings.getAttribute('aria-invalid'), 'true')
  await save.click()
  await focusOn(page, 'recipe-baseServings')
  assert.equal(await servings.inputValue(), 'dos')
  assert.equal(calls.filter(({ method, path }) => method !== 'GET' && path.startsWith('/mis-recetas')).length, 0)
  await servings.fill('5')
  assert.equal(await servings.getAttribute('aria-invalid'), null)
  await focusOn(page, 'recipe-baseServings')
  const ingredientSearch = page.getByRole('searchbox', { name: 'Buscar ingrediente por nombre' })
  await ingredientSearch.waitFor()
  const ingredientGets = calls.filter(({ path }) => path === '/ingredientes').length
  await ingredientSearch.fill('MAIZ')
  await action(page, 'Maíz').evaluate((button) => { button.click(); button.click() })
  const quantity = page.getByLabel('Cantidad', { exact: true })
  await quantity.waitFor()
  assert.equal(await quantity.count(), 1)
  await focusOn(page, await quantity.getAttribute('id'))
  await quantity.fill('2e2')
  await save.click()
  await focusOn(page, await quantity.getAttribute('id'))
  await page.getByText(/Escribe una cantidad positiva/).waitFor()
  await quantity.fill('2,25')
  await ingredientSearch.fill('SAL')
  assert.equal(await quantity.inputValue(), '2,25')
  assert.equal(calls.filter(({ path }) => path === '/ingredientes').length, ingredientGets)
  await page.getByLabel('Tradición').check()
  await page.getByLabel('Seleccionar foto o video').setInputFiles({ name: 'prueba.webm', mimeType: 'video/webm', buffer: files.webm })
  assert.equal(await save.isDisabled(), true)
  assert.equal(await review.isDisabled(), true)
  assert.equal(await page.locator('video[src^="blob:"]').count(), 1)
  const blob = await page.locator('video[src^="blob:"]').getAttribute('src')
  await action(page, 'Subir archivo').click()
  await page.locator(`video[src="${media}/subido.webm"]`).waitFor()
  assert.equal(await page.evaluate((url) => fetch(url).then(() => true, () => false), blob), false)
  const uploads = calls.filter(({ path }) => path === '/multimedia/uploads')
  assert.equal(uploads.length, 1)
  assert.match(uploads[0].headers['content-type'], /^multipart\/form-data; boundary=/)
  assert.match(uploads[0].body, /name="archivo"; filename="prueba.webm"/)
  await action(page, 'Vista previa').click()
  await page.locator(`video[src="${media}/bueno.mp4"]`).waitFor()
  await fit(page, 'Vista previa')
  await action(page, 'Editar').click()
  await page.locator(`video[src="${media}/bueno.webm"]`).waitFor()
  await fit(page, 'Editor y multimedia')
  await review.click()
  await page.getByText('Receta enviada a revisión. Está pendiente, no publicada.').waitFor()
  const writes = calls.filter(({ path, method }) => path.startsWith('/mis-recetas') && method !== 'GET')
  assert.deepEqual(writes.map(({ method }) => method), ['PUT', 'POST'])
  assert.deepEqual(JSON.parse(writes[0].body).ingredientes, [{ ingredienteId: 35, cantidad: 2.25, unidad: 'G', orden: 1, nota: null }])
  assert.deepEqual(JSON.parse(writes[0].body).multimedia.at(-1),
    { tipo: 'VIDEO', url: `${media}/subido.webm`, textoAlternativo: null, orden: 10 })
  assert.equal(JSON.parse(writes[0].body).version, 4)
  assert.equal(writes[1].headers['if-match'], '"5"')

  await go(page, '/favoritos')
  await page.locator('.favorites-grid img[alt="Foto 1"]').waitFor()
  await fit(page, 'Favoritos')
  await action(page, 'Quitar de favoritos: Mole 1').click()
  await page.getByText('Aún no tienes recetas favoritas.').waitFor()
  await go(page, '/moderador/recetas/21')
  await page.locator(`video[src="${media}/bueno.mp4"]`).waitFor()
  await fit(page, 'Moderación')
}

try {
  const files = makeMedia()
  for (const width of [320, 390, 768, 1440]) {
    await scenario(width, ['COCINERO', 'MODERADOR'], files, (page, calls) => checkWidth(page, calls, files))
    console.log(`${width}px: Inicio, Catálogo, Tradiciones, Detalle, Editor, Vista previa, Favoritos y Moderación sin desbordamiento.`)
  }
  for (const role of ['USUARIO', 'MODERADOR', 'ADMIN']) {
    await scenario(390, [role], files, async (page) => {
      await share(page, true).click()
      await login(page)
      await page.getByRole('alert').filter({ hasText: 'Puedes solicitarlo a un administrador' }).waitFor()
      await go(page, '/')
      for (const name of ['Compartir receta', 'Compartir mi receta']) {
        const button = action(page, name)
        await button.click()
        const id = await button.getAttribute('aria-controls')
        await page.locator(`[id="${id}"]`).filter({ hasText: 'Puedes solicitarlo a un administrador' }).waitFor()
        assert.equal(await button.getAttribute('aria-expanded'), 'true')
        await fit(page, `${name} (${role})`)
      }
    })
    console.log(`Compartir: ${role} no obtiene acceso y recibe una explicación en ambos botones.`)
  }
} finally {
  await browser.close()
}
