import assert from 'node:assert/strict'
import test from 'node:test'
import { demoAdminCategories, demoAdminIngredients } from '../src/data/demoAdminCatalogs.js'
import { demoAdminRecipes } from '../src/data/demoAdminRecipes.js'
import { demoAdminUsers } from '../src/data/demoAdminUsers.js'
import {
  adminDetailLimit, adminRoles, filterAdminRecipes, filterAdminUsers, findAdminRecord,
  getAdminActions, matchesAdminSearch, prepareAdminAction,
} from '../src/utils/adminRules.js'

const active = demoAdminUsers[1]
const inactive = demoAdminUsers[3]
const detail = ' Motivo de demostración. '
const userAction = (record, action, role) => prepareAdminAction('user', record, { action, role, detail })
const recipeAction = (record, action) => prepareAdminAction('recipe', record, { action, detail })

test('busca por nombre sin distinguir acentos ni mayúsculas y combina estado y rol', () => {
  const filter = { search: ' BRÍSA ', role: 'COCINERO', status: 'active' }
  assert.deepEqual(filterAdminUsers(demoAdminUsers, filter), [active])
  assert.deepEqual(filterAdminUsers(demoAdminUsers, { ...filter, status: 'inactive' }), [])
  assert.deepEqual(filterAdminUsers(demoAdminUsers, { ...filter, role: 'MODERADOR' }), [])
  assert.deepEqual(filterAdminUsers(demoAdminUsers, { search: active.id }), [])
})

test('una cuenta puede tener varios roles y ADMIN no implica tener MODERADOR asignado', () => {
  assert.ok(filterAdminUsers(demoAdminUsers, { role: 'USUARIO' }).includes(active))
  assert.ok(filterAdminUsers(demoAdminUsers, { role: 'COCINERO' }).includes(active))
  const [admin] = filterAdminUsers(demoAdminUsers, { role: 'ADMIN' })
  assert.ok(admin)
  assert.ok(!filterAdminUsers(demoAdminUsers, { role: 'MODERADOR' }).includes(admin))
  assert.deepEqual(userAction(active, 'ASIGNAR_ROL', 'MODERADOR').preview.changes.roles,
    ['USUARIO', 'COCINERO', 'MODERADOR'])
  assert.deepEqual(userAction(active, 'RETIRAR_ROL', 'COCINERO').preview.changes.roles, ['USUARIO'])
})

test('rechaza una asignación duplicada y un retiro de un rol ausente', () => {
  assert.equal(userAction(active, 'ASIGNAR_ROL', 'COCINERO').error.field, 'role')
  assert.equal(userAction(active, 'RETIRAR_ROL', 'ADMIN').error.field, 'role')
})

test('solo se admiten los cuatro códigos de rol exactos', () => {
  assert.deepEqual(adminRoles, ['USUARIO', 'COCINERO', 'MODERADOR', 'ADMIN'])
  for (const role of ['', undefined, 'admin', 'AUDITOR', 'constructor']) {
    assert.equal(userAction(active, 'ASIGNAR_ROL', role).error.field, 'role')
    assert.equal(userAction(active, 'RETIRAR_ROL', role).error.field, 'role')
  }
})

test('solo se ofrece y valida el cambio coherente con el estado de la cuenta', () => {
  assert.deepEqual(getAdminActions('user', active), ['ASIGNAR_ROL', 'RETIRAR_ROL', 'DESACTIVAR_CUENTA'])
  assert.deepEqual(getAdminActions('user', inactive), ['ASIGNAR_ROL', 'RETIRAR_ROL', 'REACTIVAR_CUENTA'])
  assert.equal(userAction(active, 'DESACTIVAR_CUENTA').preview.changes.active, false)
  assert.equal(userAction(inactive, 'REACTIVAR_CUENTA').preview.changes.active, true)
  assert.equal(userAction(inactive, 'DESACTIVAR_CUENTA').error.field, 'action')
  assert.equal(userAction(active, 'REACTIVAR_CUENTA').error.field, 'action')
})

test('las seis acciones exigen un detalle no vacío de hasta 1000 caracteres', () => {
  const scenarios = [
    ['user', active, 'ASIGNAR_ROL', 'ADMIN'], ['user', active, 'RETIRAR_ROL', 'COCINERO'],
    ['user', active, 'DESACTIVAR_CUENTA'], ['user', inactive, 'REACTIVAR_CUENTA'],
    ['recipe', demoAdminRecipes[0], 'BAJA_RECETA'], ['recipe', demoAdminRecipes[3], 'RESTAURAR_RECETA'],
  ]
  for (const [kind, record, action, role] of scenarios) {
    for (const candidate of [undefined, '', ' \n\t ', 'a'.repeat(adminDetailLimit + 1)]) {
      assert.equal(prepareAdminAction(kind, record, { action, role, detail: candidate }).error.field, 'detail', action)
    }
    assert.ok(prepareAdminAction(kind, record, { action, role, detail: 'a'.repeat(adminDetailLimit) }).preview)
    assert.equal(prepareAdminAction(kind, record, { action, role, detail }).preview.detail, detail.trim())
  }
})

test('filtra baja lógica separadamente del estado editorial y busca por título o autor', () => {
  const [published, , , deleted] = demoAdminRecipes
  assert.deepEqual(filterAdminRecipes(demoAdminRecipes, { state: 'PUBLICADA' }), [published, deleted])
  assert.deepEqual(filterAdminRecipes(demoAdminRecipes, { state: 'PUBLICADA', status: 'inactive', search: 'PEPÍTA' }), [deleted])
  assert.deepEqual(filterAdminRecipes(demoAdminRecipes, { state: 'PUBLICADA', status: 'active', search: 'copal' }), [published])
  assert.deepEqual(filterAdminRecipes(demoAdminRecipes, { state: 'ARCHIVADA', status: 'active' }), [])
})

test('dar de baja conserva el estado editorial, aun si estaba PUBLICADA', () => {
  const [published] = demoAdminRecipes
  assert.deepEqual(recipeAction(published, 'BAJA_RECETA').preview.changes, { deleted: true, state: 'PUBLICADA' })
  assert.equal(recipeAction(published, 'RESTAURAR_RECETA').error.field, 'action')
  assert.equal(recipeAction(demoAdminRecipes[3], 'BAJA_RECETA').error.field, 'action')
})

test('restaurar una receta publicada exige revisión y restaurar una archivada no la desarchiva', () => {
  assert.deepEqual(recipeAction(demoAdminRecipes[3], 'RESTAURAR_RECETA').preview.changes, { deleted: false, state: 'PENDIENTE' })
  assert.deepEqual(recipeAction(demoAdminRecipes[4], 'RESTAURAR_RECETA').preview.changes, { deleted: false, state: 'ARCHIVADA' })
  for (const state of ['BORRADOR', 'PENDIENTE', 'RECHAZADA']) {
    const record = { ...demoAdminRecipes[4], state }
    assert.deepEqual(recipeAction(record, 'RESTAURAR_RECETA').preview.changes, { deleted: false, state })
  }
})

test('rechaza recursos inexistentes, acciones sin seleccionar y acciones de otro recurso', () => {
  for (const [kind, records] of [['user', demoAdminUsers], ['recipe', demoAdminRecipes]]) {
    const missing = findAdminRecord(records, 'no-existe')
    assert.equal(missing, undefined)
    assert.deepEqual(getAdminActions(kind, missing), [])
    assert.equal(prepareAdminAction(kind, missing, { action: 'BAJA_RECETA', detail }).error.field, 'action')
  }
  assert.equal(userAction(active, '').error.field, 'action')
  assert.equal(userAction(active, 'BAJA_RECETA').error.field, 'action')
  assert.equal(recipeAction(demoAdminRecipes[0], 'ASIGNAR_ROL').error.field, 'action')
})

test('la preparación no cambia los objetos ni los arreglos originales', () => {
  const usersBefore = structuredClone(demoAdminUsers)
  const recipesBefore = structuredClone(demoAdminRecipes)
  const user = Object.freeze({ ...active, roles: Object.freeze([...active.roles]) })
  const recipe = Object.freeze({ ...demoAdminRecipes[3] })
  const assigned = userAction(user, 'ASIGNAR_ROL', 'ADMIN').preview.changes.roles
  const removed = userAction(user, 'RETIRAR_ROL', 'COCINERO').preview.changes.roles
  assert.notEqual(assigned, user.roles)
  assert.notEqual(removed, user.roles)
  userAction(active, 'DESACTIVAR_CUENTA')
  userAction(inactive, 'REACTIVAR_CUENTA')
  recipeAction(demoAdminRecipes[0], 'BAJA_RECETA')
  recipeAction(recipe, 'RESTAURAR_RECETA')
  assert.deepEqual(demoAdminUsers, usersBefore)
  assert.deepEqual(demoAdminRecipes, recipesBefore)
})

test('los catálogos admiten búsqueda por nombre y los ejemplos se ajustan al modelo', () => {
  assert.deepEqual(demoAdminIngredients.filter(({ name }) => matchesAdminSearch(name, ' MAIZ ')).map(({ name }) => name), ['Maíz'])
  assert.ok(demoAdminCategories.every(({ name, description }) => name.trim() && name.length <= 100 && description.length <= 255))
  assert.ok(demoAdminIngredients.every(({ name }) => name.trim() && name.length <= 150))
})
