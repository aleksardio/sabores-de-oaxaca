import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { demoCookRecipes, isDemoRecipeEditable, recipeStates } from '../data/demoCookRecipes.js'
import { normalizeRecipeText } from '../utils/recipeEditorValidation.js'

const states = Object.entries(recipeStates)

export default function CookRecipesPage() {
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const stateFilter = useRef(null)
  const query = normalizeRecipeText(search)
  const visible = demoCookRecipes.filter((recipe) => (
    (!state || recipe.state === state) && normalizeRecipeText(recipe.title).includes(query)
  ))

  function clearFilters() {
    setState('')
    setSearch('')
    stateFilter.current.focus()
  }

  return (
    <section className="cook-view" aria-labelledby="cook-list-title">
      <header>
        <h1 id="cook-list-title">Mis recetas</h1>
        <p className="cook-muted">Explora recetas ficticias en las distintas etapas del flujo editorial. No pertenecen a una cuenta ni al catálogo público.</p>
      </header>
      <ul className="cook-state-summary" role="list" aria-label="Resumen de recetas de ejemplo por estado">
        {states.map(([value, { label }]) => (
          <li key={value} data-state={value}>
            <span>{label}</span>
            <strong>{demoCookRecipes.filter((recipe) => recipe.state === value).length}</strong>
          </li>
        ))}
      </ul>
      <div className="cook-actions">
        <Link className="site-button cook-primary" to="nueva"><span aria-hidden="true">+</span> Nueva receta</Link>
      </div>
      <section className="cook-panel" aria-labelledby="cook-examples-title">
        <h2 id="cook-examples-title">Recetas de ejemplo</h2>
        <div className="cook-filters">
          <label className="cook-field">
            <span>Filtrar por estado</span>
            <select ref={stateFilter} value={state} onChange={(event) => setState(event.target.value)}>
              <option value="">Todos los estados</option>
              {states.map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="cook-field">
            <span>Buscar por título</span>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. calabaza" />
          </label>
        </div>
        <p className="cook-muted cook-results" role="status">
          {visible.length === 0 ? 'No hay recetas de ejemplo para estos filtros.' : `${visible.length} de ${demoCookRecipes.length} recetas de ejemplo`}
        </p>
        {visible.length > 0 ? (
          <table className="cook-table" role="table" aria-labelledby="cook-examples-title">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader" scope="col">Receta</th>
                <th role="columnheader" scope="col">Estado</th>
                <th role="columnheader" scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {visible.map((recipe) => (
                <tr key={recipe.id} role="row">
                  <th role="rowheader" scope="row">
                    {recipe.title}<small>{recipe.categories.join(' · ')}</small>
                  </th>
                  <td role="cell"><span className="cook-badge" data-state={recipe.state}>{recipeStates[recipe.state].label}</span></td>
                  <td role="cell">
                    <div className="cook-actions">
                      <Link className="site-button" to={`${recipe.id}/vista-previa`} aria-label={`Vista previa: ${recipe.title}`}>Vista previa</Link>
                      {isDemoRecipeEditable(recipe.state) && (
                        <Link className="site-button" to={`${recipe.id}/editar`} aria-label={`Editar: ${recipe.title}`}>Editar</Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <button className="site-button" type="button" onClick={clearFilters}>Limpiar filtros</button>
        )}
      </section>
    </section>
  )
}
