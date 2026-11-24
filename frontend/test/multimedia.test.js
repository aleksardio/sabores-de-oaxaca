import assert from 'node:assert/strict'
import test from 'node:test'
import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { apiRequest } from '../src/services/apiClient.js'
import { createAuthSession } from '../src/services/authSession.js'
import { createCookRecipesService } from '../src/services/cookRecipesService.js'
import { createMultimediaService } from '../src/services/multimediaService.js'
import { createRecipeOperation, resolveRecipeConflict, saveAndRequestReview } from '../src/utils/cookRecipeActions.js'
import { mediaAccept, mediaLimit, validateMediaFile } from '../src/utils/multimediaFiles.js'
import { blankDraft, changedRecipeBody, draftFromDetail, toRecipeBody, validateRecipeDraft, validateRecipeForReview } from '../src/utils/recipeEditorValidation.js'
import { createLocalPreviews, markMediaSaved } from '../src/utils/recipeMedia.js'

const file = (name = 'foto.jpg', type = 'image/jpeg', size = 1) => new File([new Uint8Array(size)], name, { type })
const receipt = { tipo: 'IMAGEN', url: 'https://archivos.example/foto.jpg', nombreOriginal: 'foto.jpg', tamanoBytes: 1 }
const reply = (data = receipt) => Response.json(data, { status: 201 })
const detail = {
  id: 1, version: 4, estado: 'RECHAZADA', eliminadoEn: null, titulo: 'Salsa', descripcion: 'Casera',
  preparacion: 'Moler.', tipo: 'COMUN', porcionesBase: 4, categorias: [], ingredientes: [],
  multimedia: [{ id: 1, tipo: 'VIDEO', url: 'https://archivos.example/existente.mp4', textoAlternativo: 'Preparación', orden: 1 }],
}

async function setup(t, respond) {
  const session = createAuthSession()
  t.after(session.dispose)
  let account = 1
  const calls = []
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    if (path.endsWith('/auth/login')) return Response.json({ token: `fake-${account}`, tipo: 'Bearer', expiraEnSegundos: 300 })
    if (path.endsWith('/auth/logout')) return new Response(null, { status: 204 })
    if (path.endsWith('/auth/me')) return Response.json({ id: account, nombreVisible: 'Prueba', correo: 'cook@example.invalid', roles: ['COCINERO'] })
    calls.push({ path, ...options })
    return respond(path, options)
  })
  const login = () => session.signIn(new Map([['email', 'cook@example.invalid'], ['password', 'fake']]))
  await login()
  const user = session.getSnapshot().user
  return { user, calls, session, upload: createMultimediaService(session.requestAuthenticated, user).upload,
    cook: createCookRecipesService(session.requestAuthenticated, user),
    switchAccount: async () => { await session.signOut(); account++; await login() } }
}

test('sube FormData como archivo único con Bearer y deja el boundary al navegador; JSON no cambia', async (t) => {
  const { upload, calls } = await setup(t, (path) => path.endsWith('/uploads') ? reply() : Response.json({}))
  const photo = file()
  const { signal } = new AbortController()
  assert.deepEqual(await upload(photo, signal), receipt)
  const [call] = calls
  assert.equal(call.path, '/api/v1/multimedia/uploads')
  assert.equal(call.method, 'POST')
  assert.equal(call.signal, signal)
  assert.deepEqual(call.headers, { Accept: 'application/json', Authorization: 'Bearer fake-1' })
  assert.ok(call.body instanceof FormData)
  assert.deepEqual([...call.body.keys()], ['archivo'])
  assert.equal(call.body.get('archivo'), photo)
  assert.match(new Request('https://api.example', { method: 'POST', body: call.body, headers: call.headers })
    .headers.get('content-type'), /^multipart\/form-data; boundary=/)
  await apiRequest('/json', { method: 'PUT', body: { titulo: 'Mole' }, token: 'fake', ifMatch: '"4"', signal })
  assert.deepEqual(calls[1].headers, {
    Accept: 'application/json', Authorization: 'Bearer fake', 'Content-Type': 'application/json', 'If-Match': '"4"',
  })
  assert.equal(calls[1].body, '{"titulo":"Mole"}')
})

test('comprueba extensiones, MIME opcional, archivo vacío y formatos no permitidos', () => {
  for (const [extension, mime, type] of [
    ['JPG', 'image/jpeg', 'IMAGEN'], ['jpeg', 'image/jpeg', 'IMAGEN'], ['png', 'image/png', 'IMAGEN'],
    ['webp', 'image/webp', 'IMAGEN'], ['mp4', 'video/mp4', 'VIDEO'], ['webm', 'video/webm', 'VIDEO'],
  ]) {
    assert.ok(mediaAccept.split(',').includes(`.${extension.toLowerCase()}`))
    assert.ok(mediaAccept.split(',').includes(mime))
    assert.deepEqual(validateMediaFile(file(`prueba.${extension}`, mime)), { type, mime })
    assert.deepEqual(validateMediaFile(file(`prueba.${extension}`, '')), { type, mime })
  }
  assert.match(validateMediaFile(file('foto.jpg', 'image/jpeg', 0)).error, /vacío/)
  assert.match(validateMediaFile(file('foto.png', 'image/jpeg')).error, /no coincide/)
  assert.match(validateMediaFile(file('foto.svg', 'image/svg+xml')).error, /JPEG/)
  assert.match(validateMediaFile(file('foto.jpg.exe', '')).error, /JPEG/)
  assert.match(validateMediaFile(file('foto', 'image/jpeg')).error, /JPEG/)
})

test('acepta exactamente 5 MiB de imagen y 30 MiB de video y rechaza un byte más', () => {
  for (const [name, mime, type, mib] of [['foto.png', 'image/png', 'IMAGEN', 5], ['video.webm', 'video/webm', 'VIDEO', 30]]) {
    const limit = mib * 1024 * 1024
    assert.equal(mediaLimit(type), limit)
    assert.deepEqual(validateMediaFile(file(name, mime, limit)), { type, mime })
    assert.match(validateMediaFile(file(name, mime, limit + 1)).error, new RegExp(`${mib} MiB`))
  }
})

test('los archivos inválidos no originan una solicitud HTTP', async (t) => {
  const { upload, calls } = await setup(t, assert.fail)
  await assert.rejects(upload(file('archivo.txt', 'text/plain')), { status: 400 })
  assert.equal(calls.length, 0)
})

test('un archivo sin MIME se envía con el MIME de su extensión, preservando nombre, bytes y lastModified', async (t) => {
  const bytes = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 255)
  const original = new File([bytes], 'Prueba.PNG', { lastModified: 1_700_000_000_000 })
  const response = { ...receipt, url: 'https://archivos.example/prueba.png', nombreOriginal: original.name, tamanoBytes: bytes.length }
  const { upload, calls } = await setup(t, () => reply(response))
  assert.deepEqual(await upload(original), response)
  const [{ body, headers }] = calls
  const part = body.get('archivo')
  assert.equal(original.type, '')
  assert.equal(part.type, 'image/png')
  assert.equal(part.name, original.name)
  assert.equal(part.lastModified, original.lastModified)
  assert.deepEqual(new Uint8Array(await part.arrayBuffer()), bytes)
  const request = new Request('https://api.example', { method: 'POST', body, headers })
  assert.match(await request.text(), /Content-Disposition: form-data; name="archivo"; filename="Prueba.PNG"\r\nContent-Type: image\/png\r\n/)
})

test('un MIME explícito incompatible no se sustituye ni se envía por HTTP', async (t) => {
  const { upload, calls } = await setup(t, assert.fail)
  for (const mime of ['image/jpeg', 'application/octet-stream']) {
    await assert.rejects(upload(file('prueba.png', mime)), { status: 400, message: /no coincide/ })
  }
  assert.deepEqual(calls, [])
})

test('exige 201 y valida JSON, tipo, URL, nombre y bytes; acepta video HTTPS sin imponer dominio', async (t) => {
  let response
  const { upload } = await setup(t, () => response)
  for (const fields of [
    { tipo: 'VIDEO' }, { tipo: 'AUDIO' }, { url: 'blob:https://archivos.example/uuid' }, { url: 'http://archivos.example/img' },
    { url: 'https://usuario:clave@archivos.example/img' }, { url: 'https://@archivos.example/img' },
    { nombreOriginal: ' ' }, { nombreOriginal: null }, { tamanoBytes: 0 }, { tamanoBytes: 1.5 }, { tamanoBytes: '1' },
    { tamanoBytes: 5 * 1024 * 1024 + 1 },
  ]) {
    response = reply({ ...receipt, ...fields })
    await assert.rejects(upload(file()), { status: 201, message: /201 inválida/ })
  }
  for (const invalid of [new Response('not JSON', { status: 201 }), reply(null), reply('texto')]) {
    response = invalid
    await assert.rejects(upload(file()), { status: 201, message: /201 inválida/ })
  }
  response = Response.json(receipt)
  await assert.rejects(upload(file()), { status: 200, message: /No se pudo confirmar/ })
  const playable = { tipo: 'VIDEO', url: 'https://cdn.example:443/uploads/video.webm', nombreOriginal: 'video.webm', tamanoBytes: mediaLimit('VIDEO') }
  response = reply(playable)
  assert.deepEqual(await upload(file('video.webm', 'video/webm')), playable)
  response = reply({ ...playable, tamanoBytes: mediaLimit('VIDEO') + 1 })
  await assert.rejects(upload(file('video.webm', 'video/webm')), { status: 201 })
})

test('errores seguros 400, 403, 413, 500 y red no cierran sesión ni se reintentan; 401 sí la invalida', async (t) => {
  let status
  const { upload, calls, user, session } = await setup(t, () => {
    if (!status) throw new TypeError('internal')
    return Response.json({ message: 'internal', campos: { correo: 'internal' } }, { status })
  })
  for (const [code, message] of [[400, /rechazó el archivo/], [403, /rol COCINERO/], [413, /demasiado grande/],
    [500, /error interno durante la subida/], [0, /No se pudo confirmar la subida/]]) {
    status = code
    await assert.rejects(upload(file()), (error) => error.status === status && message.test(error.message) && !error.fields.email)
    assert.equal(session.getSnapshot().user, user)
  }
  status = 401
  await assert.rejects(upload(file()), { status: 401, message: /Vuelve a iniciar sesión/ })
  assert.equal(session.getSnapshot().user, null)
  assert.equal(calls.length, 6)
})

test('mismo bloqueo para subida y guardado; cancelación descarta respuestas tardías y no libera la operación siguiente', async (t) => {
  const replies = []
  const { upload, calls, session, user } = await setup(t, () => new Promise((resolve) => replies.push(resolve)))
  const operation = createRecipeOperation()
  const first = operation.start('file-1')
  const pending = upload(file(), first.signal)
  assert.equal(operation.start('file-1'), null)
  assert.equal(operation.start(), null)
  assert.equal(operation.cancel('file-2'), false)
  assert.equal(operation.cancel('file-1'), true)
  const second = operation.start('file-2')
  const next = upload(file(), second.signal)
  replies[0](new Response(null, { status: 401 })) // Simula una respuesta ya en tránsito al cancelar/quitar.
  await assert.rejects(pending, { name: 'AbortError', message: /cancelada/ })
  operation.finish(first)
  assert.equal(operation.busy, true)
  assert.equal(session.getSnapshot().user, user)
  replies[1](reply())
  assert.deepEqual(await next, receipt)
  operation.finish(second)
  await assert.rejects(upload(file(), first.signal), { name: 'AbortError' })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].signal.aborted, true)
})

test('un 201 tardío o un 401 de una cuenta anterior no se aplican a la sesión nueva', async (t) => {
  const replies = []
  const { upload, session, switchAccount } = await setup(t, () => new Promise((resolve) => replies.push(resolve)))
  const lateSuccess = upload(file())
  const lateFailure = upload(file())
  await switchAccount()
  replies[0](reply())
  replies[1](new Response(null, { status: 401 }))
  await assert.rejects(lateSuccess, { name: 'AbortError' })
  await assert.rejects(lateFailure, { status: 401 })
  assert.equal(session.getSnapshot().user.id, 2)
})

test('revoca las vistas previas descartadas, sustituidas y al limpiar el editor', (t) => {
  const revoke = t.mock.method(URL, 'revokeObjectURL', () => {})
  const previews = createLocalPreviews()
  const first = previews.create(file())
  const replaced = previews.create(file('otra-foto.jpg'))
  const removed = previews.create(file('tercera-foto.jpg'))
  previews.retain([{ local: { src: replaced } }, { local: { src: removed } }])
  assert.equal(previews.has(first), false)
  previews.release(removed)
  previews.clear()
  previews.clear()
  assert.deepEqual(revoke.mock.calls.map(({ arguments: args }) => args[0]), [first, removed, replaced])
})

test('un archivo pendiente, subiendo, cancelado o con error bloquea guardado, revisión y serialización', () => {
  const base = draftFromDetail(detail)
  for (const status of ['ready', 'uploading', 'error', 'canceled']) {
    const draft = { ...base, multimedia: [...base.multimedia, { id: 'file-1', type: 'IMAGEN', order: '2', alt: '',
      local: { status, file: file(), src: 'blob:https://example.invalid/uuid' } }] }
    assert.match(validateRecipeDraft(draft).multimedia, /pendientes/)
    assert.match(validateRecipeForReview(draft, detail).multimedia, /pendientes/)
    assert.throws(() => toRecipeBody(draft), /pendientes/)
    assert.throws(() => changedRecipeBody(draft, base), /pendientes/)
  }
  const blob = { ...base, multimedia: [{ url: 'blob:https://example.invalid/uuid' }] }
  assert.throws(() => toRecipeBody(blob), /HTTPS/)
  assert.throws(() => changedRecipeBody(blob, base), /HTTPS/)
  assert.deepEqual(toRecipeBody(blankDraft).multimedia, [])
})

const reviewable = {
  ...detail,
  categorias: [{ id: 2, nombre: 'Salsas' }],
  ingredientes: [{ id: 3, nombre: 'Sal', cantidadBase: null, unidad: 'AL_GUSTO', orden: 1, nota: null }],
}

test('reenviar tras quitar o reemplazar una referencia antigua inválida hace PUT válido y usa su nueva versión', async (t) => {
  const { cook, calls } = await setup(t, (_path, { method }) => method === 'PUT'
    ? Response.json({ id: 1, version: 7, estado: 'RECHAZADA' })
    : Response.json({ id: 1, version: 8, estado: 'PENDIENTE' }))
  for (const [oldUrl, replacement] of [[null, null], ['http://archivos.example/antiguo.jpg', {
    id: 'file-1', type: 'IMAGEN', url: receipt.url, alt: 'Salsa', order: '2',
    uploaded: { name: receipt.nombreOriginal, size: receipt.tamanoBytes },
  }]]) {
    const legacy = { ...reviewable, multimedia: [...reviewable.multimedia,
      { id: 2, tipo: 'IMAGEN', url: oldUrl, textoAlternativo: null, orden: 2 }] }
    const baseline = draftFromDetail(legacy)
    const draft = { ...baseline, multimedia: [baseline.multimedia[0], ...(replacement ? [replacement] : [])] }
    assert.throws(() => toRecipeBody(baseline), /HTTPS/)
    assert.deepEqual(validateRecipeForReview(draft, legacy), {})
    const saved = await saveAndRequestReview(cook, legacy, changedRecipeBody(draft, baseline), undefined, () => {})
    assert.equal(saved.estado, 'PENDIENTE')
    const [put, post] = calls.slice(-2)
    assert.deepEqual([put.method, put.path, post.method, post.path],
      ['PUT', '/api/v1/mis-recetas/1', 'POST', '/api/v1/mis-recetas/1/enviar-revision'])
    assert.deepEqual(JSON.parse(put.body), { ...toRecipeBody(draft), version: 4 })
    assert.deepEqual(JSON.parse(put.body).multimedia, [
      { tipo: 'VIDEO', url: reviewable.multimedia[0].url, textoAlternativo: 'Preparación', orden: 1 },
      ...(replacement ? [{ tipo: 'IMAGEN', url: receipt.url, textoAlternativo: 'Salsa', orden: 2 }] : []),
    ])
    assert.equal(post.headers['If-Match'], '"7"')
    assert.equal(post.body, undefined)
  }
  assert.equal(calls.length, 4)
})

test('una receta válida sin cambios persistibles se reenvía con solo POST y su versión vigente', async (t) => {
  const { cook, calls } = await setup(t, () => Response.json({ id: 1, version: 5, estado: 'PENDIENTE' }))
  const baseline = draftFromDetail(reviewable)
  const same = { ...baseline, multimedia: baseline.multimedia.map((row) => ({ ...row })) }
  assert.deepEqual(validateRecipeForReview(same, reviewable), {})
  assert.equal(changedRecipeBody(same, baseline), null)
  await saveAndRequestReview(cook, reviewable, changedRecipeBody(same, baseline), undefined, assert.fail)
  assert.deepEqual(calls.map(({ method, path, headers, body }) => [method, path, headers['If-Match'], body]),
    [['POST', '/api/v1/mis-recetas/1/enviar-revision', '"4"', undefined]])
})

test('subida separada del PUT: conserva referencias al fallar, serializa solo el contrato y quita sin DELETE', async (t) => {
  let updateStatus = 500
  const { upload, cook, calls } = await setup(t, (path) => path.endsWith('/uploads')
    ? reply() : Response.json({ id: 1, version: 5, estado: 'RECHAZADA' }, { status: updateStatus }))
  const base = draftFromDetail(detail)
  const uploaded = await upload(file())
  const draft = { ...base, multimedia: [...base.multimedia, {
    id: 'file-1', type: uploaded.tipo, url: uploaded.url, alt: 'Foto de la salsa', order: '2',
    uploaded: { name: uploaded.nombreOriginal, size: uploaded.tamanoBytes },
  }] }
  const body = toRecipeBody(draft)
  assert.equal(calls.length, 1)
  assert.deepEqual(body.multimedia, [{
    tipo: 'VIDEO', url: detail.multimedia[0].url, textoAlternativo: 'Preparación', orden: 1,
  }, {
    tipo: 'IMAGEN', url: receipt.url, textoAlternativo: 'Foto de la salsa', orden: 2,
  }])
  await assert.rejects(cook.update(1, body, 4), { status: 500 })
  assert.ok(draft.multimedia[1].uploaded)
  assert.deepEqual(resolveRecipeConflict(draft, base, true).draft.multimedia, draft.multimedia)
  assert.deepEqual(resolveRecipeConflict(draft, base, false).draft.multimedia, base.multimedia)
  const withoutExisting = { ...draft, multimedia: draft.multimedia.slice(1) }
  assert.deepEqual(calls.map(({ method }) => method), ['POST', 'PUT'])
  updateStatus = 200
  await cook.update(1, toRecipeBody(withoutExisting), 4)
  const saved = markMediaSaved(withoutExisting)
  assert.equal(saved.multimedia[0].uploaded, undefined)
  assert.deepEqual(toRecipeBody(saved).multimedia, [body.multimedia[1]])
  assert.deepEqual(calls.map(({ method }) => method), ['POST', 'PUT', 'PUT'])
  assert.deepEqual(JSON.parse(calls[2].body).multimedia, [body.multimedia[1]])
})

test('editor y vista previa distinguen video local con controles de un enlace remoto y deshabilitan el guardado', async (t) => {
  const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true, ws: false } })
  t.after(() => vite.close())
  const { default: Editor } = await vite.ssrLoadModule('/src/components/RecipeEditorForm.jsx')
  const { default: Preview } = await vite.ssrLoadModule('/src/components/RecipeDraftPreview.jsx')
  const base = draftFromDetail(detail)
  const draft = { ...base, multimedia: [...base.multimedia, {
    id: 'file-1', type: 'VIDEO', order: '2', alt: 'Video local',
    local: { file: file('video.webm', 'video/webm'), status: 'ready', src: 'blob:https://example.invalid/video' },
  }] }
  const editor = renderToStaticMarkup(createElement(Editor, {
    draft, errors: {}, categories: {}, ingredients: {}, onReview() {}, reviewLabel: 'Reenviar a revisión',
  }))
  assert.match(editor, /<input type="file"[^>]*accept="[^"]*video\/webm/)
  assert.match(editor, /<p id="recipe-media-privacy"[^>]*>Los archivos subidos serán públicos aunque la receta todavía sea un borrador\. No subas información privada ni fotografías o videos sin autorización\.<\/p>.*<input type="file"/)
  for (const input of editor.match(/<input type="file"[^>]*>/g)) {
    assert.match(input, /aria-describedby="recipe-media-privacy(?:[ "])/)
  }
  assert.match(editor, /<button[^>]*aria-describedby="recipe-media-privacy"[^>]*>Subir archivo<\/button>/)
  assert.match(editor, /<button[^>]*disabled="">Guardar cambios<\/button>/)
  assert.match(editor, /<button[^>]*disabled="">Reenviar a revisión<\/button>/)
  assert.doesNotMatch(editor, /type="url"|<iframe/)
  const preview = renderToStaticMarkup(createElement(Preview, { recipe: draft, showReferences: true }))
  assert.match(preview, /<video src="blob:https:\/\/example\.invalid\/video" controls=""[^>]*\/?>/)
  assert.doesNotMatch(preview, /autoplay|<iframe/)
  assert.match(preview, /href="https:\/\/archivos\.example\/existente\.mp4" target="_blank" rel="noopener noreferrer"/)
  assert.equal(preview.match(/<video /g)?.length, 1)
})
