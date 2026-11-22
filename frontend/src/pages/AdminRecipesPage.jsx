import { useEffect, useRef, useState } from 'react'
import AdminActionPreview from '../components/AdminActionPreview.jsx'
import { demoAdminRecipes } from '../data/demoAdminRecipes.js'
import { adminDeletionStates, adminEditorialStates, filterAdminRecipes, findAdminRecord } from '../utils/adminRules.js'

export default function AdminRecipesPage() {
  const [search, setSearch] = useState('')
  const [state, setState] = useState('')
  const [status, setStatus] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const searchRef = useRef(null)
  const actionTrigger = useRef(null)
  const preparationHeading = useRef(null)
  const recipes = filterAdminRecipes(demoAdminRecipes, { search, state, status })
  const selected = findAdminRecord(recipes, selectedId)

  useEffect(() => {
    if (selectedId) preparationHeading.current?.focus()
  }, [selectedId])

  function clearFilters() {
    setSearch('')
    setState('')
    setStatus('')
    searchRef.current.focus()
  }

  function closePreparation() {
    setSelectedId(null)
    actionTrigger.current?.focus()
  }

  return (
    <section className="cook-view" aria-labelledby="admin-recipes-title">
      <header>
        <p className="admin-eyebrow">Bajas lógicas</p>
        <h1 id="admin-recipes-title">Administración de recetas</h1>
        <p className="cook-muted">Consulta ejemplos independientes del sitio público y de los otros paneles. La baja lógica (<code>eliminado_en</code>) se indica por separado del estado editorial.</p>
      </header>
      <section className="cook-panel" aria-labelledby="admin-recipes-list">
        <h2 id="admin-recipes-list">Recetas de ejemplo</h2>
        <div className="cook-filters">
          <label className="cook-field">
            Buscar por título o autor
            <input ref={searchRef} type="search" value={search} onChange={(event) => {
              setSearch(event.target.value)
              setSelectedId(null)
            }} />
          </label>
          <label className="cook-field">
            Estado editorial
            <select value={state} onChange={(event) => {
              setState(event.target.value)
              setSelectedId(null)
            }}>
              <option value="">Todos los estados</option>
              {Object.entries(adminEditorialStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="cook-field">
            Baja lógica
            <select value={status} onChange={(event) => {
              setStatus(event.target.value)
              setSelectedId(null)
            }}>
              <option value="">Todas las recetas</option>
              {Object.entries(adminDeletionStates).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <p className="cook-results cook-muted" role="status">
          {recipes.length ? `${recipes.length} de ${demoAdminRecipes.length} recetas` : 'No hay recetas que coincidan con estos filtros.'}
        </p>
        {recipes.length ? (
          <table className="cook-table admin-table" role="table" aria-labelledby="admin-recipes-list">
            <thead role="rowgroup"><tr role="row">
              <th scope="col">Receta</th><th scope="col">Autor ficticio</th><th scope="col">Estado editorial</th><th scope="col">Baja lógica</th><th scope="col">Acción</th>
            </tr></thead>
            <tbody role="rowgroup">
              {recipes.map((recipe) => {
                const deleted = recipe.deletedOn !== null
                const label = deleted ? 'Preparar restauración' : 'Preparar baja'
                return (
                  <tr key={recipe.id} role="row">
                    <th scope="row" role="rowheader">{recipe.title}<small>{recipe.id}</small></th>
                    <td role="cell"><span className="admin-mobile-label" aria-hidden="true">Autor ficticio</span>{recipe.author}</td>
                    <td role="cell"><span className="admin-mobile-label" aria-hidden="true">Estado editorial</span><span className="cook-badge" data-state={recipe.state}>{adminEditorialStates[recipe.state]}</span></td>
                    <td role="cell"><span className="admin-mobile-label" aria-hidden="true">Baja lógica</span><span className="cook-badge" data-state={deleted ? 'BAJA' : 'ACTIVA'}>{adminDeletionStates[deleted ? 'inactive' : 'active']}</span></td>
                    <td role="cell"><button className="site-button" type="button" aria-label={`${label}: ${recipe.title}`} onClick={(event) => {
                      actionTrigger.current = event.currentTarget
                      if (selectedId === recipe.id) preparationHeading.current?.focus()
                      setSelectedId(recipe.id)
                    }}>{label}</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : <button className="site-button" type="button" onClick={clearFilters}>Limpiar filtros</button>}
      </section>
      {selected && (
        <AdminActionPreview key={selected.id} kind="recipe" record={selected} onCancel={closePreparation} headingRef={preparationHeading} />
      )}
    </section>
  )
}
