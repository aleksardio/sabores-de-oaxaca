export const reportReasonLimit = 500
export const reportStates = Object.freeze({
  ABIERTO: 'Abierto',
  EN_REVISION: 'En revisión',
  RESUELTO: 'Resuelto',
  DESCARTADO: 'Descartado',
})

export const reportDecisions = Object.freeze({
  descartar: { label: 'Descartar reporte', result: 'DESCARTADO',
    consequence: 'El reporte quedará descartado. La receta no cambiará.' },
  'dar-baja': { label: 'Dar de baja receta', result: 'RESUELTO',
    consequence: 'La receta dejará de estar visible. Este reporte y los demás pendientes de la misma receta quedarán resueltos. No se borrarán archivos ni asociaciones.' },
})

export const isPendingReport = (report) => report?.estado === 'ABIERTO' || report?.estado === 'EN_REVISION'
export const isOwnReportRecipe = (user, recipe) => Boolean(user && recipe?.autor?.id === user.id)

export function validateReportReason(reason) {
  if (typeof reason !== 'string' || !reason.trim()) return 'Escribe el motivo del reporte.'
  if (reason.length > reportReasonLimit) return `El motivo no debe superar ${reportReasonLimit} caracteres.`
  return ''
}
