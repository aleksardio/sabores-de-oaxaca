import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router'
import RequestError from '../components/RequestError.jsx'
import { recipeTypes } from '../data/recipeEditorOptions.js'
import { useModeration } from '../hooks/useModeration.js'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { moderationPageSize } from '../services/moderationService.js'
import { isOwnModerationRecipe } from '../utils/moderationAccess.js'

const queuePath = '/moderador/recetas'

function queueSearch(page, type) {
  const params = new URLSearchParams()
  if (page) params.set('pagina', page)
  if (type) params.set('tipo', type)
  return params.size ? `?${params}` : ''
}

export default function ModerationRecipesPage() {
  const { user, service } = useModeration()
  const [params, setParams] = useSearchParams()
  const rawPage = params.get('pagina') ?? ''
  const page = /^\d+$/.test(rawPage) && Number(rawPage) * moderationPageSize <= 2147483647 ? Number(rawPage) : 0
  const type = Object.hasOwn(recipeTypes, params.get('tipo')) ? params.get('tipo') : ''
  const load = useCallback((signal) => service.list(page, type, signal), [service, page, type])
  // La cola se vuelve a consultar cada vez que se regresa desde un detalle.
  const { data, error, loading, retry } = usePublicRequest(load)

  return (
    <section className="cook-view" aria-labelledby="mod-recipes-heading">
      <header>
        <p className="mod-eyebrow">Cola editorial</p>
        <h1 id="mod-recipes-heading">Revisión de recetas</h1>
        <p className="cook-muted">Consulta las recetas pendientes. Solo puedes aprobar o rechazar las recetas de otros autores.</p>
      </header>
      {data && (
        <ul className="cook-state-summary" role="list" aria-label="Resumen de recetas pendientes">
          <li data-state="PENDIENTE"><span>Pendientes{type && ' del tipo seleccionado'}</span><strong>{data.totalElementos}</strong></li>
        </ul>
      )}
      <section className="cook-panel" aria-labelledby="mod-list-title" aria-busy={loading}>
        <h2 id="mod-list-title">Recetas pendientes</h2>
        <div className="cook-filters">
          <label className="cook-field">Filtrar por tipo
            <select value={type} onChange={(event) => setParams(queueSearch(0, event.target.value))}>
              <option value="">Todos los tipos</option>
              {Object.entries(recipeTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {loading && <p role="status">Cargando recetas pendientes…</p>}
        {error && <RequestError error={error} onRetry={retry} />}
        {data && (
          <>
            {data.contenido.length ? (
              <ul className="mod-cards" role="list">
                {data.contenido.map((recipe) => (
                  <li className="mod-card" key={recipe.id} data-state="PENDIENTE">
                    <div className="mod-card-heading">
                      <h3>{recipe.titulo}</h3>
                      <span className="cook-badge" data-state="PENDIENTE">Pendiente</span>
                    </div>
                    <p className="cook-muted">Autor: {recipe.autor}</p>
                    <p className="cook-muted">{recipeTypes[recipe.tipo]}</p>
                    {isOwnModerationRecipe(user, recipe) && <p className="mod-card-note">Receta propia: otra persona debe moderarla.</p>}
                    <Link className="site-button" to={{ pathname: String(recipe.id), search: queueSearch(page, type) }}
                      aria-label={`Ver receta: ${recipe.titulo}`}>Ver receta <span aria-hidden="true">→</span></Link>
                  </li>
                ))}
              </ul>
            ) : <p role="status">{data.totalElementos ? 'No hay recetas en esta página.' : 'No hay recetas pendientes con este filtro.'}</p>}
            {data.totalPaginas > 0 && (
              <nav className="cook-pagination" aria-label="Paginación de moderación">
                {page < data.totalPaginas && <p role="status">Página {page + 1} de {data.totalPaginas}</p>}
                <div className="cook-actions">
                  {page > 0 && <Link className="site-button" to={queuePath + queueSearch(Math.min(page - 1, data.totalPaginas - 1), type)}>Anterior</Link>}
                  {page + 1 < data.totalPaginas && <Link className="site-button" to={queuePath + queueSearch(page + 1, type)}>Siguiente</Link>}
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </section>
  )
}
