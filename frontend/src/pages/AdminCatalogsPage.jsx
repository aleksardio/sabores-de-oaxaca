import { useEffect, useId, useRef, useState } from 'react'
import { getAdminCatalogs } from '../services/adminCatalogsService.js'
import { matchesAdminSearch } from '../utils/adminRules.js'

function CatalogSection({ title, searchLabel, entries }) {
  const id = useId()
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)
  const visible = entries.filter((entry) => matchesAdminSearch(entry.nombre, search))

  return (
    <section className="cook-panel" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <label className="cook-field">
        {searchLabel}
        <input ref={searchRef} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <p className="cook-results cook-muted" role="status">
        {visible.length ? `${visible.length} de ${entries.length} registros` : entries.length ? 'No hay coincidencias con esta búsqueda.' : 'No hay registros disponibles.'}
      </p>
      {visible.length ? (
        <ul className="admin-catalog-list" role="list">
          {visible.map((entry) => (
            <li key={entry.id}>
              <h3>{entry.nombre}</h3>
              <p className="admin-catalog-id">{entry.id}</p>
              {entry.descripcion && <p className="cook-muted">{entry.descripcion}</p>}
            </li>
          ))}
        </ul>
      ) : entries.length > 0 && search ? (
        <button className="site-button" type="button" onClick={() => {
          setSearch('')
          searchRef.current.focus()
        }}>Limpiar búsqueda</button>
      ) : null}
    </section>
  )
}

export default function AdminCatalogsPage() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const current = result?.attempt === attempt ? result : null

  useEffect(() => {
    const controller = new AbortController()
    getAdminCatalogs(controller.signal).then(
      (catalogs) => { if (!controller.signal.aborted) setResult({ attempt, ...catalogs }) },
      (error) => { if (!controller.signal.aborted && error.name !== 'AbortError') setResult({ attempt, error }) },
    )
    return () => controller.abort()
  }, [attempt])

  return (
    <section className="cook-view" aria-labelledby="admin-catalogs-title">
      <header>
        <p className="admin-eyebrow">Datos de referencia</p>
        <h1 id="admin-catalogs-title">Catálogos</h1>
        <p className="cook-muted">Consulta las categorías e ingredientes registrados. Esta sección es de solo lectura.</p>
      </header>
      {!current && <p role="status">Cargando catálogos…</p>}
      {current?.error && <div role="alert"><p>No se pudieron cargar los catálogos. Comprueba la conexión e inténtalo de nuevo.</p><button className="site-button" type="button" onClick={() => setAttempt((value) => value + 1)}>Reintentar</button></div>}
      {current && !current.error && <div className="admin-catalog-grid">
        <CatalogSection title="Categorías" searchLabel="Buscar categoría por nombre" entries={current.categories} />
        <CatalogSection title="Ingredientes" searchLabel="Buscar ingrediente por nombre" entries={current.ingredients} />
      </div>}
    </section>
  )
}
