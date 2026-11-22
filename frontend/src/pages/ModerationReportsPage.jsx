import { Link } from 'react-router'
import ModerationQueue from '../components/ModerationQueue.jsx'
import { demoReviewerId, findDemoModerationRecipe } from '../data/demoModerationRecipes.js'
import { demoModerationReports, formatDemoReportDate, moderationReportStates } from '../data/demoModerationReports.js'

const reports = demoModerationReports.map((report) => ({
  ...report,
  title: findDemoModerationRecipe(report.recipeId)?.title ?? 'Receta no encontrada',
}))

export default function ModerationReportsPage() {
  return (
    <section className="cook-view" aria-labelledby="mod-reports-heading">
      <header>
        <p className="mod-eyebrow">Bandeja de reportes</p>
        <h1 id="mod-reports-heading">Reportes</h1>
        <p className="cook-muted">Consulta motivos y fechas ficticias. El estado de un reporte es independiente del estado de su receta.</p>
      </header>
      <ModerationQueue
        title="Reportes de ejemplo"
        items={reports}
        states={moderationReportStates}
        searchLabel="Buscar por receta"
        renderItem={(report) => (
          <>
            <div className="mod-card-heading">
              <span className="mod-eyebrow">{report.id}</span>
              <span className="cook-badge" data-state={report.state}>{moderationReportStates[report.state]}</span>
            </div>
            <h3>{report.title}</h3>
            <p>{report.summary}</p>
            <p className="cook-muted"><time dateTime={report.createdOn}>{formatDemoReportDate(report.createdOn)}</time></p>
            {report.reporterId === demoReviewerId && <p className="mod-card-note">Reportante de referencia</p>}
            <Link className="site-button" to={report.id} aria-label={`Ver reporte ${report.id}`}>Ver reporte <span aria-hidden="true">→</span></Link>
          </>
        )}
      />
    </section>
  )
}
