import { canModerate } from '../utils/moderationAccess.js'
import { isOwnReportRecipe, isPendingReport, reportDecisions, reportStates, validateReportReason } from '../utils/reportRules.js'
import { utcDate } from '../utils/utcDate.js'
import { ApiError } from './apiClient.js'

export const reportsPageSize = 12
export const reportNotFound = 'El reporte no existe.'
export const ownReportRecipe = 'No puedes reportar tu propia receta.'
const base = '/moderacion/reportes'
const operationsByUser = new WeakMap()
const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0
const positive = (value) => nonnegative(value) && value > 0
const isState = (value) => typeof value === 'string' && Object.hasOwn(reportStates, value)
const isCreated = (row) => positive(row?.id) && positive(row.recetaId) && !validateReportReason(row.motivo)
  && isState(row.estado) && utcDate(row.creadoEn) !== null
const isDetail = (row) => isCreated(row) && typeof row.titulo === 'string' && typeof row.reportante === 'string'
  && (isPendingReport(row) ? row.resueltoEn === null : utcDate(row.resueltoEn) !== null)
const invalidFilters = 'Los filtros de reportes no son válidos.'
const modErrors = {
  400: 'La solicitud de moderación no es válida.',
  403: 'Acceso denegado. Se requiere autorización de MODERADOR o ADMIN.',
  404: reportNotFound,
  409: 'El reporte cambió o la receta ya no admite la baja.',
}
const createErrors = {
  400: 'El servidor rechazó el motivo. Revisa que no esté vacío y que no supere 500 caracteres.',
  403: `No tienes autorización para reportar esta receta. ${ownReportRecipe}`,
  404: 'La receta ya no está disponible para reportar.',
  409: 'Ya existe un reporte pendiente tuyo para esta receta.',
}

export function validReportsPage(page) {
  return nonnegative(page) && page * reportsPageSize <= 2147483647
}

export function isUncertainReportWrite(error) {
  if (error?.name === 'AbortError') return false
  return !(error instanceof ApiError) || ![400, 401, 403, 404, 409].includes(error.status)
}

function detailPath(id) {
  if (!positive(id)) throw new ApiError(400, 'El identificador del reporte no es válido.')
  return `${base}/${id}`
}

export function createReportsService(requestAuthenticated, user) {
  // Comparten el bloqueo las instancias de una misma sesión, incluso al remontar una vista.
  const operations = (user && operationsByUser.get(user)) || { creations: new Set(), decision: null }
  if (user) operationsByUser.set(user, operations)

  async function request(path, options, validate, moderation = true) {
    options.signal?.throwIfAborted()
    if (!user) throw new ApiError(401, 'Inicia sesión para continuar.')
    if (moderation && !canModerate(user)) throw new ApiError(403, modErrors[403])
    const data = await requestAuthenticated(user, path, {
      errors: moderation ? modErrors : createErrors, ...options, discardStaleErrors: true,
    })
    options.signal?.throwIfAborted()
    if (!validate(data)) throw new ApiError(options.expected ?? 200, 'El servidor devolvió una respuesta inesperada.')
    return data
  }

  function readDetail(id, signal) {
    return request(detailPath(id), { signal }, (data) => isDetail(data) && data.id === id)
  }

  async function writeDecision(report, action) {
    let notice
    try {
      const updated = await request(`${detailPath(report.id)}/${action}`, { method: 'POST' },
        (data) => isDetail(data) && data.id === report.id && data.recetaId === report.recetaId
          && data.estado === reportDecisions[action].result)
      return { report: updated, confirmed: true }
    } catch (error) {
      if (error?.status === 409) notice = `${error.message} Se volvió a consultar el reporte antes de permitir otra decisión.`
      else if (isUncertainReportWrite(error)) notice = 'No se pudo confirmar la decisión. Se consultó el estado del reporte antes de permitir otra.'
      else throw error
    }
    try {
      return { report: await readDetail(report.id), notice }
    } catch (error) {
      if (error.name === 'AbortError' || error.status === 401) throw error
      return { error, notice: 'No se pudo confirmar la decisión ni actualizar el reporte. Vuelve a consultar antes de decidir.' }
    }
  }

  return {
    async create(recipe, reason) {
      if (!positive(recipe?.id)) throw new ApiError(400, 'El identificador de la receta no es válido.')
      if (isOwnReportRecipe(user, recipe)) throw new ApiError(403, ownReportRecipe)
      const problem = validateReportReason(reason)
      if (problem) throw new ApiError(400, problem)
      const { id } = recipe
      if (operations.creations.has(id)) throw new ApiError(409, 'Ya hay un envío en curso para esta receta.')
      operations.creations.add(id)
      try {
        return await request(`/recetas/${id}/reportes`, { method: 'POST', expected: 201, body: { motivo: reason.trim() } },
          (data) => isCreated(data) && data.recetaId === id && data.estado === 'ABIERTO', false)
      } finally {
        operations.creations.delete(id)
      }
    },
    async list({ estado = '', pagina = 0 } = {}, signal) {
      if (!validReportsPage(pagina) || (estado !== '' && !isState(estado))) throw new ApiError(400, invalidFilters)
      const query = new URLSearchParams({ pagina, tamano: reportsPageSize })
      if (estado) query.set('estado', estado)
      return request(`${base}?${query}`, { signal, errors: { ...modErrors, 400: invalidFilters } },
        (data) => Array.isArray(data?.contenido) && data.contenido.length <= reportsPageSize
          && data.contenido.every((row) => isDetail(row) && (!estado || row.estado === estado))
          && new Set(data.contenido.map(({ id }) => id)).size === data.contenido.length
          && data.pagina === pagina && data.tamano === reportsPageSize
          && nonnegative(data.totalElementos) && nonnegative(data.totalPaginas)
          && data.totalPaginas === Math.ceil(data.totalElementos / reportsPageSize)
          && data.contenido.length <= Math.max(0, data.totalElementos - pagina * reportsPageSize))
    },
    async detail(id, signal) {
      detailPath(id)
      while (operations.decision && !signal?.aborted) await Promise.allSettled([operations.decision])
      return readDetail(id, signal)
    },
    async decide(report, action, { confirmed = false } = {}) {
      if (!confirmed || !Object.hasOwn(reportDecisions, action) || !isDetail(report) || !isPendingReport(report)) {
        throw new ApiError(400, 'Consulta el reporte pendiente y confirma la decisión.')
      }
      // Serializa incluso decisiones sobre otros reportes: una baja puede resolver varios.
      if (operations.decision) throw new ApiError(409, 'Ya hay una decisión en curso. Vuelve a consultar el reporte.')
      const submission = writeDecision(report, action)
      operations.decision = submission
      try {
        return await submission
      } finally {
        operations.decision = null
      }
    },
  }
}
