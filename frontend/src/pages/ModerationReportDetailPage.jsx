import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import ModerationDecisionForm from '../components/ModerationDecisionForm.jsx'
import ReportDate from '../components/ReportDate.jsx'
import RequestError from '../components/RequestError.jsx'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { useReports } from '../hooks/useReports.js'
import { getRecipeById, parseRecipeId } from '../services/recipesService.js'
import { reportNotFound } from '../services/reportsService.js'
import { createReportReview } from '../utils/reportReview.js'
import { isPendingReport, reportStates } from '../utils/reportRules.js'

function PublicRecipe({ report }) {
  const load = useCallback((signal) => getRecipeById(report.recetaId, undefined, signal), [report])
  const { data, loading, error, retry } = usePublicRequest(load)
  if (loading) return <p role="status">Consultando disponibilidad pública…</p>
  if (error?.status === 404) return <p>La receta no está disponible en el catálogo público.</p>
  if (error) return <RequestError error={error} onRetry={retry} retryLabel="Consultar receta de nuevo" />
  return data && <Link to={`/recetas/${report.recetaId}`}>Ver receta pública</Link>
}

function ReportFacts({ report }) {
  return (
    <section className="cook-panel" aria-labelledby="mod-report-facts">
      <h2 id="mod-report-facts">Datos del reporte</h2>
      <dl className="mod-facts">
        <div><dt>Estado del reporte</dt><dd><span className="cook-badge" data-state={report.estado}>{reportStates[report.estado]}</span></dd></div>
        <div><dt>Motivo</dt><dd className="mod-justification">{report.motivo}</dd></div>
        <div><dt>Reportante</dt><dd>{report.reportante}</dd></div>
        <div><dt>Fecha de creación</dt><dd><ReportDate value={report.creadoEn} /></dd></div>
        <div><dt>Fecha de resolución</dt><dd><ReportDate value={report.resueltoEn} /></dd></div>
        <div><dt>Receta relacionada</dt><dd>{report.titulo} (ID {report.recetaId})</dd></div>
      </dl>
      <PublicRecipe report={report} />
    </section>
  )
}

function ReportDetail({ id, back }) {
  const { service } = useReports()
  const review = useMemo(() => createReportReview(service, id), [service, id])
  const { report, loading, loadError, decisionError, notice, confirmed, confirmation, busy, forbidden } =
    useSyncExternalStore(review.subscribe, review.getSnapshot)
  const unavailable = id === null || loadError?.status === 404

  useEffect(() => {
    if (id === null) return
    review.load()
    return review.cancel
  }, [id, review])

  return (
    <section className="cook-view" aria-labelledby="mod-report-heading">
      <header>
        <Link className="cook-back" to={back}>← Volver a Reportes</Link>
        <h1 id="mod-report-heading">{unavailable ? 'Reporte no encontrado' : `Reporte ${id}`}</h1>
      </header>
      {notice && <p role="status" className="mod-restriction">{notice}</p>}
      {unavailable ? <p role="status">{reportNotFound}</p> : (
        <>
          {loading && <p role="status">Cargando reporte…</p>}
          {loadError && <RequestError error={loadError} onRetry={review.load} retryLabel="Volver a consultar" />}
          {decisionError && <p className="cook-error" role="alert">{decisionError.message}</p>}
          {confirmed && <p role="status" className="cook-check-ok">Decisión registrada: {reportStates[report.estado]}.</p>}
          {report && <ReportFacts report={report} />}
          {isPendingReport(report) && !forbidden && <ModerationDecisionForm review={review} confirmation={confirmation} busy={busy} />}
        </>
      )}
    </section>
  )
}

export default function ModerationReportDetailPage() {
  const { id: rawId } = useParams()
  const { search } = useLocation()
  const id = /^[1-9]\d*$/.test(rawId) ? parseRecipeId(rawId) : null
  return <ReportDetail id={id} back={`/moderador/reportes${search}`} />
}
