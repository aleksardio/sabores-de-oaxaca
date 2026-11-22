const recipeActions = [
  { id: 'APROBAR', label: 'Aprobar', from: 'PENDIENTE', to: 'PUBLICADA' },
  { id: 'RECHAZAR', label: 'Rechazar', from: 'PENDIENTE', to: 'RECHAZADA', requiresReason: true },
  { id: 'ARCHIVAR', label: 'Archivar', from: 'PUBLICADA', to: 'ARCHIVADA', requiresReason: true },
  { id: 'RESTAURAR', label: 'Restaurar para nueva revisión', from: 'ARCHIVADA', to: 'PENDIENTE' },
]

const reportActions = [
  { id: 'REVISAR_REPORTE', label: 'Pasar a revisión', from: 'ABIERTO', to: 'EN_REVISION' },
  { id: 'RESOLVER_REPORTE', label: 'Resolver', from: 'EN_REVISION', to: 'RESUELTO', requiresReason: true },
  { id: 'DESCARTAR_REPORTE', label: 'Descartar', from: 'EN_REVISION', to: 'DESCARTADO', requiresReason: true },
]

export const moderationReasonLimit = 1000

export function getRecipeModeration(recipe, reviewerId) {
  if (!recipe) return { actions: [], restriction: 'Receta no encontrada.' }
  if (recipe.author.id === reviewerId) {
    return { actions: [], restriction: 'Otra persona debe moderar esta receta: su autor coincide con la referencia de prueba.' }
  }
  if (recipe.state === 'BORRADOR') {
    return { actions: [], restriction: 'Un borrador no se puede aprobar directamente. El autor debe enviarlo a revisión.' }
  }
  if (recipe.state === 'RECHAZADA') {
    return { actions: [], restriction: 'El autor debe corregir la receta y enviarla de nuevo. Moderación no puede devolverla a Pendiente.' }
  }
  return {
    actions: recipeActions.filter(({ from }) => from === recipe.state),
    restriction: recipe.state === 'PUBLICADA' ? 'Solo el autor puede retirar una receta publicada a borrador.' : '',
  }
}

export function getReportModeration(report, reviewerId) {
  if (!report) return { actions: [], restriction: 'Reporte no encontrado.' }
  if (report.reporterId === reviewerId) {
    return { actions: [], restriction: 'Otra persona debe gestionar este reporte: su reportante coincide con la referencia de prueba.' }
  }
  const actions = reportActions.filter(({ from }) => from === report.state)
  return { actions, restriction: actions.length ? '' : 'Este reporte está cerrado y no admite más decisiones.' }
}

// Describe una intención sobre un único recurso. No modifica registros ni define un contrato de API.
export function prepareModerationDecision(kind, record, reviewerId, actionId, reason = '') {
  const { actions, restriction } = kind === 'recipe'
    ? getRecipeModeration(record, reviewerId)
    : getReportModeration(record, reviewerId)
  const action = actions.find(({ id }) => id === actionId)

  if (!action) {
    return { error: { field: 'action', message: actions.length ? 'Elige una acción disponible.' : restriction } }
  }

  const justification = reason.trim()
  if (action.requiresReason && !justification) {
    return { error: { field: 'reason', message: 'Escribe una justificación para esta acción.' } }
  }
  if (justification.length > moderationReasonLimit) {
    return { error: { field: 'reason', message: `La justificación no debe superar ${moderationReasonLimit} caracteres.` } }
  }

  return {
    decision: {
      resourceId: record.id,
      action: action.id,
      label: action.label,
      from: action.from,
      to: action.to,
      justification,
    },
  }
}
