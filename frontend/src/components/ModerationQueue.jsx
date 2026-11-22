import { useId, useRef, useState } from 'react'
import { normalizeRecipeText } from '../utils/recipeEditorValidation.js'

export default function ModerationQueue({ title, items, states, searchLabel, renderItem }) {
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const id = useId()
  const filter = useRef(null)
  const query = normalizeRecipeText(search)
  const visible = items.filter((item) => (
    (!state || item.state === state) && normalizeRecipeText(item.title).includes(query)
  ))

  function clearFilters() {
    setState('')
    setSearch('')
    filter.current.focus()
  }

  return (
    <>
      <ul className="cook-state-summary" role="list" aria-label={`Resumen de ${title.toLowerCase()} por estado`}>
        {Object.entries(states).map(([value, label]) => (
          <li key={value} data-state={value}>
            <span>{label}</span>
            <strong>{items.filter((item) => item.state === value).length}</strong>
          </li>
        ))}
      </ul>
      <section className="cook-panel" aria-labelledby="mod-list-title">
        <h2 id="mod-list-title">{title}</h2>
        <div className="cook-filters">
          <div className="cook-field">
            <label htmlFor={`${id}-filter`}>Filtrar por estado</label>
            <select id={`${id}-filter`} ref={filter} value={state} onChange={(event) => setState(event.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="cook-field">
            <label htmlFor={`${id}-search`}>{searchLabel}</label>
            <input id={`${id}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>
        <p className="cook-results cook-muted" role="status">
          {visible.length ? `${visible.length} de ${items.length} ejemplos` : 'No hay coincidencias con estos filtros.'}
        </p>
        {visible.length ? (
          <ul className="mod-cards" role="list">
            {visible.map((item) => (
              <li className="mod-card" key={item.id} data-state={item.state}>{renderItem(item)}</li>
            ))}
          </ul>
        ) : <button className="site-button" type="button" onClick={clearFilters}>Limpiar filtros</button>}
      </section>
    </>
  )
}
