import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCookRequestsService } from '../src/services/cookRequestsService.js'

const user = { id: 1 }
const pending = { id: 7, usuarioId: 1, nombre: 'Ana', estado: 'PENDIENTE' }

test('consulta y envía solicitud propia sin asignar rol', async () => {
  const calls = []
  const service = createCookRequestsService(async (...args) => {
    calls.push(args)
    return args[2]?.method === 'POST' ? pending : { solicitud: null }
  }, user)
  assert.equal(await service.own(), null)
  assert.deepEqual(await service.send(), pending)
  assert.equal(calls[1][1], '/solicitud-cocinero')
  assert.equal(calls[1][2].method, 'POST')
})

test('lista y resuelve con rutas administrativas y valida la respuesta', async () => {
  const service = createCookRequestsService(async (_user, path) => path.includes('?') ? [pending] : { ...pending, estado: 'APROBADA' }, user)
  assert.deepEqual(await service.pending(0), [pending])
  assert.equal((await service.decide(7, 'aprobar')).estado, 'APROBADA')
  await assert.rejects(service.decide(7, 'rechazar'), { status: 200 })
})

test('propaga conflictos y no genera datos de respaldo', async () => {
  const service = createCookRequestsService(async () => { throw Object.assign(new Error(), { status: 409 }) }, user)
  await assert.rejects(service.send(), { status: 409 })
})
