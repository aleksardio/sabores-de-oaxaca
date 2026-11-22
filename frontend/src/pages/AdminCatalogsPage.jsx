import { useId, useRef, useState } from 'react'
import { demoAdminCategories, demoAdminIngredients } from '../data/demoAdminCatalogs.js'
import { matchesAdminSearch } from '../utils/adminRules.js'

function CatalogSection({ title, searchLabel, entries }) {
  const id = useId()
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)
  const visible = entries.filter((entry) => matchesAdminSearch(entry.name, search))

  return (
    <section className="cook-panel" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <label className="cook-field">
        {searchLabel}
        <input ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <p className="cook-results cook-muted" role="status">
        {visible.length ? `${visible.length} de ${entries.length} ejemplos` : 'No hay coincidencias con esta búsqueda.'}
      </p>
      {visible.length ? (
        <ul className="admin-catalog-list" role="list">
          {visible.map((entry) => (
            <li key={entry.id}>
              <h3>{entry.name}</h3>
              <p className="admin-catalog-id">{entry.id}</p>
              {entry.description && <p className="cook-muted">{entry.description}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <button className="site-button" type="button" onClick={() => {
          setSearch('')
          searchRef.current.focus()
        }}>Limpiar búsqueda</button>
      )}
    </section>
  )
}

export default function AdminCatalogsPage() {
  return (
    <section className="cook-view" aria-labelledby="admin-catalogs-title">
      <header>
        <p className="admin-eyebrow">Datos de referencia</p>
        <h1 id="admin-catalogs-title">Catálogos</h1>
        <p className="cook-muted">Categorías e ingredientes de ejemplo, disponibles solo para consulta. Esta demostración no permite crear ni editar entradas.</p>
      </header>
      <div className="admin-catalog-grid">
        <CatalogSection title="Categorías" searchLabel="Buscar categoría por nombre" entries={demoAdminCategories} />
        <CatalogSection title="Ingredientes" searchLabel="Buscar ingrediente por nombre" entries={demoAdminIngredients} />
      </div>
    </section>
  )
}
