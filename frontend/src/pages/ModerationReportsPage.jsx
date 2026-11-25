import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router'
import ReportDate from '../components/ReportDate.jsx'
import RequestError from '../components/RequestError.jsx'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { useReports } from '../hooks/useReports.js'
import { validReportsPage } from '../services/reportsService.js'
import { reportStates } from '../utils/reportRules.js'

const queuePath = '/moderador/reportes'

function queueSearch(page, state) {
  const params = new URLSearchParams()
  if (page) params.set('pagina', page)
  if (state !== 'ABIERTO') params.set('estado', state)
  return params.size ? `?${params}` : ''
}

export default function ModerationReportsPage() {
  const { service } = useReports()
  const [params, setParams] = useSearchParams()
  const rawPage = params.get('pagina') ?? ''
  const rawState = params.get('estado')
  const page = /^\d+$/.test(rawPage) && validReportsPage(Number(rawPage)) ? Number(rawPage) : 0
  const state = rawState === '' || Object.hasOwn(reportStates, rawState) ? rawState : 'ABIERTO'
  const load = useCallback((signal) => service.list({ estado: state, pagina: page }, signal), [service, page, state])
  const { data, error, loading, retry } = usePublicRequest(load)

  return (
    <section className="cook-view" aria-labelledby="mod-reports-heading">
      <header>
        <p className="mod-eyebrow">Bandeja de moderación</p>
        <h1 id="mod-reports-heading">Reportes</h1>
      </header>
      <section className="cook-panel" aria-labelledby="mod-report-list" aria-busy={loading}>
        <h2 id="mod-report-list">Reportes de recetas</h2>
        <div className="cook-filters">
          <label className="cook-field">Filtrar por estado
            <select value={state} onChange={(event) => setParams(queueSearch(0, event.target.value))}>
              <option value="">Todos los estados</option>
              {Object.entries(reportStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {loading && <p role="status">Cargando reportes…</p>}
        {error && <RequestError error={error} onRetry={retry} />}
        {data && (
          <>
            {data.contenido.length > 0 ? (
              <ul className="mod-cards" role="list">
                {data.contenido.map((report) => (
                  <li key={report.id} className="mod-card" data-state={report.estado}>
                    <div className="mod-card-heading">
                      <h3>{report.titulo}</h3>
                      <span className="cook-badge" data-state={report.estado}>{reportStates[report.estado]}</span>
                    </div>
                    <p className="mod-justification">{report.motivo}</p>
                    <p className="cook-muted">Reportante: {report.reportante}</p>
                    <p className="cook-muted"><ReportDate value={report.creadoEn} /></p>
                    <Link className="site-button" to={{ pathname: String(report.id), search: queueSearch(page, state) }}
                      aria-label={`Ver reporte ${report.id}`}>Ver reporte <span aria-hidden="true">→</span></Link>
                  </li>
                ))}
              </ul>
            ) : <p role="status">{data.totalElementos ? 'No hay reportes en esta página.' : 'No hay reportes con este filtro.'}</p>}
            {data.totalPaginas > 0 && (
              <nav className="cook-pagination" aria-label="Paginación de reportes">
                {page < data.totalPaginas && <p role="status">Página {page + 1} de {data.totalPaginas}</p>}
                <div className="cook-actions">
                  {page > 0 && <Link className="site-button" to={queuePath + queueSearch(Math.min(page - 1, data.totalPaginas - 1), state)}>Anterior</Link>}
                  {page + 1 < data.totalPaginas && <Link className="site-button" to={queuePath + queueSearch(page + 1, state)}>Siguiente</Link>}
                </div>
              </nav>
            )}
            {data.totalPaginas === 0 && page > 0 && <Link className="site-button" to={queuePath + queueSearch(0, state)}>Ir a la primera página</Link>}
          </>
        )}
      </section>
    </section>
  )
}
