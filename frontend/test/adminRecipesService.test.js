import assert from 'node:assert/strict'
import test from 'node:test'
import { createAdminRecipesService } from '../src/services/adminRecipesService.js'

const recipe = { id: 7, titulo: 'Mole', autor: 'Cocinera', estado: 'PUBLICADA', eliminadoEn: null, creadoEn: '2026-01-01T00:00:00', version: 2 }
const user = { id: 1 }

test('envía filtros y paginación al servidor', async () => {
  const calls = []
  const service = createAdminRecipesService(async (...args) => {
    calls.push(args)
    return { contenido: [recipe], pagina: 1, totalElementos: 21, totalPaginas: 2 }
  }, user)
  const page = await service.list({ texto: 'mole', estado: 'PUBLICADA', baja: 'false', pagina: 1 })
  assert.equal(page.contenido[0].autor, 'Cocinera')
  assert.match(calls[0][1], /pagina=1&tamano=20&texto=mole&estado=PUBLICADA&baja=false/)
})

test('baja y restauración envían versión y justificación', async () => {
  const calls = []
  const service = createAdminRecipesService(async (...args) => {
    calls.push(args)
    return args[1].endsWith('/restaurar')
      ? { ...recipe, version: 3, estado: 'PENDIENTE', eliminadoEn: null }
      : { ...recipe, version: 3, eliminadoEn: '2026-01-01T00:00:00' }
  }, user)
  await service.change(recipe, '  Revisión  ')
  assert.equal(calls[0][1], '/admin/recetas/7/baja')
  assert.equal(calls[0][2].ifMatch, '"2"')
  assert.deepEqual(calls[0][2].body, { detalle: 'Revisión' })
  await service.change({ ...recipe, eliminadoEn: '2026-01-01T00:00:00' }, 'Motivo')
  assert.equal(calls[1][1], '/admin/recetas/7/restaurar')
  await assert.rejects(service.change(recipe, '  '), { status: 400 })
})

test('fallos y respuestas inválidas no producen datos alternativos', async () => {
  const service = createAdminRecipesService(async () => { throw Object.assign(new Error('rechazo'), { status: 403 }) }, user)
  await assert.rejects(service.list({ texto: '', estado: '', baja: '', pagina: 0 }), { status: 403 })
  await assert.rejects(service.change(recipe, 'Motivo'), { status: 403 })
})
