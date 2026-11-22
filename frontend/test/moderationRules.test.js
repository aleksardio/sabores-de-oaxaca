import assert from 'node:assert/strict'
import { test } from 'node:test'
import { demoReviewerId, findDemoModerationRecipe } from '../src/data/demoModerationRecipes.js'
import { demoModerationReports, findDemoModerationReport } from '../src/data/demoModerationReports.js'
import { getRecipeModeration, getReportModeration, prepareModerationDecision } from '../src/utils/moderationRules.js'

const pending = findDemoModerationRecipe('demo-tamales-hongos')
const published = findDemoModerationRecipe('demo-agua-ciruela')
const archived = findDemoModerationRecipe('demo-frijoles-quelites')
const ownRecipe = findDemoModerationRecipe('demo-crema-milpa')
const open = findDemoModerationReport('REP-001')
const inReview = findDemoModerationReport('REP-002')

const prepareRecipe = (record, action, reason) => prepareModerationDecision('recipe', record, demoReviewerId, action, reason)
const prepareReport = (record, action, reason) => prepareModerationDecision('report', record, demoReviewerId, action, reason)

test('aprobar solo se prepara desde pendiente y no publica el ejemplo', () => {
  assert.equal(prepareRecipe(pending, 'APROBAR').decision.to, 'PUBLICADA')
  assert.equal(pending.state, 'PENDIENTE')
  for (const state of ['PUBLICADA', 'BORRADOR', 'RECHAZADA', 'ARCHIVADA']) {
    assert.equal(prepareRecipe({ ...pending, state }, 'APROBAR').error.field, 'action')
  }
})

test('una receta propia no admite acciones en ningún estado moderable', () => {
  for (const [state, action] of [
    ['PENDIENTE', 'APROBAR'], ['PENDIENTE', 'RECHAZAR'], ['PUBLICADA', 'ARCHIVAR'], ['ARCHIVADA', 'RESTAURAR'],
  ]) {
    const recipe = { ...ownRecipe, state }
    assert.deepEqual(getRecipeModeration(recipe, demoReviewerId).actions, [])
    assert.equal(prepareRecipe(recipe, action, 'Motivo ficticio').error.field, 'action')
  }
})

test('archivar corresponde solo a publicada y restaurar solo a archivada', () => {
  const recipeStates = ['BORRADOR', 'PENDIENTE', 'PUBLICADA', 'RECHAZADA', 'ARCHIVADA']
  for (const state of recipeStates) {
    const actions = getRecipeModeration({ ...pending, state }, demoReviewerId).actions
    assert.equal(actions.some(({ id }) => id === 'ARCHIVAR'), state === 'PUBLICADA')
    assert.equal(actions.some(({ id }) => id === 'RESTAURAR'), state === 'ARCHIVADA')
  }
  assert.equal(prepareRecipe(archived, 'RESTAURAR').decision.to, 'PENDIENTE')
  assert.equal(prepareRecipe(published, 'RETIRAR_A_BORRADOR').error.field, 'action')
  assert.deepEqual(getRecipeModeration({ ...pending, state: 'RECHAZADA' }, demoReviewerId).actions, [])
})

test('rechazar y archivar requieren una justificación no vacía', () => {
  for (const [record, action, to] of [[pending, 'RECHAZAR', 'RECHAZADA'], [published, 'ARCHIVAR', 'ARCHIVADA']]) {
    assert.equal(prepareRecipe(record, action, ' \n ').error.field, 'reason')
    const { decision } = prepareRecipe(record, action, '  Motivo ficticio  ')
    assert.equal(decision.to, to)
    assert.equal(decision.justification, 'Motivo ficticio')
    assert.equal(prepareRecipe(record, action, 'a'.repeat(1001)).error.field, 'reason')
  }
})

test('un reporte abierto solo puede pasar a revisión', () => {
  assert.deepEqual(getReportModeration(open, demoReviewerId).actions.map(({ id }) => id), ['REVISAR_REPORTE'])
  assert.equal(prepareReport(open, 'REVISAR_REPORTE').decision.to, 'EN_REVISION')
  assert.equal(prepareReport(open, 'RESOLVER_REPORTE', 'Motivo ficticio').error.field, 'action')
})

test('un reporte en revisión puede resolverse o descartarse con justificación', () => {
  for (const [action, to] of [['RESOLVER_REPORTE', 'RESUELTO'], ['DESCARTAR_REPORTE', 'DESCARTADO']]) {
    assert.equal(prepareReport(inReview, action, '').error.field, 'reason')
    assert.equal(prepareReport(inReview, action, 'Motivo ficticio').decision.to, to)
  }
  for (const id of ['REP-003', 'REP-004']) {
    assert.deepEqual(getReportModeration(findDemoModerationReport(id), demoReviewerId).actions, [])
  }
})

test('un reporte propio no se gestiona y la autoría editorial es independiente', () => {
  const ownReport = findDemoModerationReport('REP-005')
  for (const state of ['ABIERTO', 'EN_REVISION']) {
    assert.deepEqual(getReportModeration({ ...ownReport, state }, demoReviewerId).actions, [])
  }
  const reportAboutOwnRecipe = findDemoModerationReport('REP-006')
  assert.equal(prepareReport(reportAboutOwnRecipe, 'REVISAR_REPORTE').decision.to, 'EN_REVISION')
  assert.deepEqual(getRecipeModeration(findDemoModerationRecipe(reportAboutOwnRecipe.recipeId), demoReviewerId).actions, [])
})

test('preparar la resolución solo describe la transición del reporte', () => {
  const recipe = findDemoModerationRecipe(inReview.recipeId)
  const before = structuredClone({ recipe, report: inReview })
  const { decision } = prepareReport(inReview, 'RESOLVER_REPORTE', 'Motivo ficticio')
  assert.deepEqual(decision, {
    resourceId: inReview.id,
    action: 'RESOLVER_REPORTE',
    label: 'Resolver',
    from: 'EN_REVISION',
    to: 'RESUELTO',
    justification: 'Motivo ficticio',
  })
  assert.deepEqual({ recipe, report: inReview }, before)
})

test('los IDs inexistentes se manejan sin una decisión y los reportes tienen receta', () => {
  const missingRecipe = findDemoModerationRecipe('no-existe')
  const missingReport = findDemoModerationReport('no-existe')
  assert.equal(missingRecipe, undefined)
  assert.equal(missingReport, undefined)
  assert.equal(prepareRecipe(missingRecipe, 'APROBAR').error.message, 'Receta no encontrada.')
  assert.equal(prepareReport(missingReport, 'REVISAR_REPORTE').error.message, 'Reporte no encontrado.')
  assert.ok(demoModerationReports.every(({ recipeId }) => findDemoModerationRecipe(recipeId)))
})
