import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import RequestError from '../components/RequestError.jsx'
import { recipeTypes } from '../data/recipeEditorOptions.js'
import { useCookRecipes } from '../hooks/useCookRecipes.js'
import { usePublicRequest } from '../hooks/usePublicRequest.js'
import { cookPageSize } from '../services/cookRecipesService.js'
import { canEditRecipe, canWriteRecipes, recipeStates } from '../utils/cookRecipeRules.js'
import { normalizeRecipeText } from '../utils/recipeEditorValidation.js'

const states = Object.entries(recipeStates)

export default function CookRecipesPage() {
  const { user, service } = useCookRecipes()
  const [params] = useSearchParams()
  const inputPage = params.get('pagina') ?? ''
  const page = /^\d+$/.test(inputPage) && Number(inputPage) * cookPageSize <= 2147483647 ? Number(inputPage) : 0
  const load = useCallback((signal) => service.list(page, signal), [service, page])
  const { data, error, loading, retry } = usePublicRequest(load)
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const resultsHeading = useRef(null)
  const lastPage = useRef(page)
  useEffect(() => {
    if (lastPage.current !== page) {
      lastPage.current = page
      resultsHeading.current?.focus()
    }
  }, [page])
  const query = normalizeRecipeText(search)
  const visible = data?.contenido.filter((row) => (!state || row.estado === state) && normalizeRecipeText(row.titulo).includes(query))
  const pageLink = (index) => index ? `?pagina=${index}` : '/cocinero/recetas'

  return (
    <section className="cook-view" aria-labelledby="cook-list-title">
      <header>
        <h1 id="cook-list-title">Mis recetas</h1>
        <p className="cook-muted">Consulta tus recetas y su estado editorial. Una receta dada de baja conserva su estado.</p>
      </header>
      {data?.contenido.length > 0 && (
        <section aria-label="Resumen de la página actual">
          <p className="cook-muted cook-results">Estados en esta página, incluidas las bajas:</p>
          <ul className="cook-state-summary" role="list">
            {states.map(([value, label]) => (
              <li key={value} data-state={value}><span>{label}</span>
                <strong>{data.contenido.filter((recipe) => recipe.estado === value).length}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
      {canWriteRecipes(user) && (
        <div className="cook-actions"><Link className="site-button cook-primary" to="nueva">+ Nueva receta</Link></div>
      )}
      <section className="cook-panel" aria-labelledby="cook-results-title" aria-busy={loading}>
        <h2 ref={resultsHeading} tabIndex={-1} id="cook-results-title">Recetas propias</h2>
        {loading && <p role="status">Cargando recetas…</p>}
        {error && <RequestError error={error} onRetry={retry} />}
        {data && (
          <>
            {data.contenido.length > 0 && (
              <>
                <p className="cook-muted" id="cook-page-filters">Los filtros solo se aplican a la página actual.</p>
                <div className="cook-filters" role="group" aria-labelledby="cook-page-filters">
                  <label className="cook-field">Filtrar por estado
                    <select value={state} onChange={(event) => setState(event.target.value)}>
                      <option value="">Todos los estados</option>
                      {states.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="cook-field">Buscar por título
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
                  </label>
                </div>
                <p className="cook-muted cook-results" role="status">{visible.length} de {data.contenido.length} en esta página.</p>
              </>
            )}
            {visible.length ? (
              <table className="cook-table" role="table" aria-labelledby="cook-results-title">
                <thead role="rowgroup">
                  <tr role="row"><th scope="col" role="columnheader">Receta</th><th scope="col" role="columnheader">Estado</th><th scope="col" role="columnheader">Acciones</th></tr>
                </thead>
                <tbody role="rowgroup">
                  {visible.map((recipe) => (
                    <tr key={recipe.id} role="row">
                      <th scope="row" role="rowheader">{recipe.titulo}<small>{recipeTypes[recipe.tipo]} · Porciones: {recipe.porcionesBase}</small></th>
                      <td role="cell">
                        <span className="cook-badge" data-state={recipe.estado}>{recipeStates[recipe.estado]}</span>
                        {recipe.eliminadoEn !== null && <small>Dada de baja</small>}
                      </td>
                      <td role="cell"><div className="cook-actions">
                        <Link className="site-button" to={`${recipe.id}/vista-previa`} aria-label={`Ver detalle: ${recipe.titulo}`}>Ver detalle</Link>
                        {canEditRecipe(user, recipe) && <Link className="site-button" to={`${recipe.id}/editar`} aria-label={`Editar: ${recipe.titulo}`}>Editar</Link>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p role="status">{data.contenido.length ? 'No hay coincidencias en esta página.'
              : data.totalElementos ? 'No hay recetas en esta página.' : 'Todavía no tienes recetas.'}</p>}
            {data.totalPaginas > 0 && (
              <nav className="cook-pagination" aria-label="Paginación de Mis recetas">
                <p role="status">{page < data.totalPaginas ? `Página ${page + 1} de ${data.totalPaginas}. ` : ''}
                  {data.totalElementos} recetas en total, incluidas las bajas.</p>
                <div className="cook-actions">
                  {page > 0 && <Link className="site-button" to={pageLink(Math.min(page - 1, data.totalPaginas - 1))}>Anterior</Link>}
                  {page + 1 < data.totalPaginas && <Link className="site-button" to={pageLink(page + 1)}>Siguiente</Link>}
                </div>
              </nav>
            )}
          </>
        )}
      </section>
    </section>
  )
}
