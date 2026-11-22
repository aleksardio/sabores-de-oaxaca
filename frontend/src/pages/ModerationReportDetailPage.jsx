import { Link, useParams } from 'react-router'
import ModerationDecisionForm from '../components/ModerationDecisionForm.jsx'
import { demoReviewerId, findDemoModerationRecipe, moderationRecipeStates } from '../data/demoModerationRecipes.js'
import { findDemoModerationReport, formatDemoReportDate, moderationReportStates } from '../data/demoModerationReports.js'
import { getReportModeration } from '../utils/moderationRules.js'

export default function ModerationReportDetailPage() {
  const { id } = useParams()
  const report = findDemoModerationReport(id)
  const recipe = findDemoModerationRecipe(report?.recipeId)

  return (
    <section className="cook-view" aria-labelledby="mod-report-heading">
      <header>
        <Link className="cook-back" to="/moderador/reportes">← Volver a Reportes</Link>
        <h1 id="mod-report-heading">{report ? `Reporte ${report.id}` : 'Reporte no encontrado'}</h1>
        {report && <p className="cook-muted">Ejemplo de solo lectura. La identidad de referencia sirve para probar restricciones; no representa una sesión autenticada.</p>}
      </header>
      {!report ? <p className="cook-muted">No hay un reporte de demostración con ese identificador.</p> : (
        <>
          <section className="cook-panel" aria-labelledby="mod-report-facts">
            <h2 id="mod-report-facts">Datos del reporte</h2>
            <dl className="mod-facts">
              <div><dt>Estado del reporte</dt><dd><span className="cook-badge" data-state={report.state}>{moderationReportStates[report.state]}</span></dd></div>
              <div><dt>Fecha de creación ficticia</dt><dd><time dateTime={report.createdOn}>{formatDemoReportDate(report.createdOn)}</time></dd></div>
              <div><dt>Motivo</dt><dd>{report.reason}</dd></div>
              <div>
                <dt>Receta relacionada</dt>
                <dd>{recipe ? <Link to={`/moderador/recetas/${recipe.id}`}>{recipe.title}</Link> : 'Receta no encontrada'}</dd>
              </div>
              {recipe && <div><dt>Estado de la receta</dt><dd><span className="cook-badge" data-state={recipe.state}>{moderationRecipeStates[recipe.state]}</span></dd></div>}
            </dl>
            <p className="cook-muted">Resolver el reporte no cambia la receta. Si corresponde archivarla, se prepara como una decisión editorial separada.</p>
            {recipe?.author.id === demoReviewerId && <p className="mod-restriction">No se ofrecen decisiones editoriales para esta receta porque su autor coincide con la referencia de prueba.</p>}
          </section>
          <ModerationDecisionForm
            key={report.id}
            kind="report"
            record={report}
            reviewerId={demoReviewerId}
            moderation={getReportModeration(report, demoReviewerId)}
            states={moderationReportStates}
          />
        </>
      )}
    </section>
  )
}
