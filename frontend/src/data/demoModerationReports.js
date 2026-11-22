import { demoReviewerId } from './demoModerationRecipes.js'

export const moderationReportStates = {
  ABIERTO: 'Abierto',
  EN_REVISION: 'En revisión',
  RESUELTO: 'Resuelto',
  DESCARTADO: 'Descartado',
}

// Las recetas fuera de publicación pudieron recibir el reporte antes de cambiar de estado.
export const demoModerationReports = [
  {
    id: 'REP-001',
    recipeId: 'demo-agua-ciruela',
    reporterId: 'persona-abril',
    state: 'ABIERTO',
    createdOn: '2026-10-16',
    summary: 'Cantidad poco clara',
    reason: 'El ejemplo no aclara si el peso de la ciruela se mide antes o después de retirar el hueso.',
  },
  {
    id: 'REP-002',
    recipeId: 'demo-frijoles-quelites',
    reporterId: 'persona-junio',
    state: 'EN_REVISION',
    createdOn: '2026-10-14',
    summary: 'Preparación incompleta',
    reason: 'Falta indicar cómo se limpian y seleccionan los quelites antes de saltearlos.',
  },
  {
    id: 'REP-003',
    recipeId: 'demo-agua-ciruela',
    reporterId: 'persona-abril',
    state: 'RESUELTO',
    createdOn: '2026-10-10',
    summary: 'Revisión de categoría',
    reason: 'Se pide revisar si la etiqueta «Bebidas» describe la receta correctamente.',
  },
  {
    id: 'REP-004',
    recipeId: 'demo-frijoles-quelites',
    reporterId: 'persona-junio',
    state: 'DESCARTADO',
    createdOn: '2026-10-09',
    summary: 'Posible duplicado',
    reason: 'Se solicita comprobar si la preparación se repite en otra ficha del catálogo ficticio.',
  },
  {
    id: 'REP-005',
    recipeId: 'demo-agua-ciruela',
    reporterId: demoReviewerId,
    state: 'EN_REVISION',
    createdOn: '2026-10-08',
    summary: 'Porciones por verificar',
    reason: 'Se pide comprobar que la cantidad indicada corresponde a las cuatro porciones.',
  },
  {
    id: 'REP-006',
    recipeId: 'demo-crema-milpa',
    reporterId: 'persona-abril',
    state: 'ABIERTO',
    createdOn: '2026-10-07',
    summary: 'Detalle de ingredientes',
    reason: 'Se pide indicar si el elote se desgrana en crudo o después de cocerlo.',
  },
]

export function findDemoModerationReport(id) {
  return demoModerationReports.find((report) => report.id === id)
}

export function formatDemoReportDate(date) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))
}
