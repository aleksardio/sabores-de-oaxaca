import { useState } from 'react'
import { validServings } from '../services/recipesService.js'
import { ingredientRows } from '../utils/publicRecipePresentation.js'
import RequestError from './RequestError.jsx'

const servingOptions = [2, 4, 6]

export default function ServingsCalculator({
  ingredients, baseServings, servings, onChange, loading, error, onRetry,
}) {
  const [draft, setDraft] = useState(String(baseServings))
  const rows = ingredients ? ingredientRows(ingredients, servings !== baseServings) : null

  function choose(value) {
    setDraft(String(value))
    onChange(value)
  }

  return (
    <section className="detail-panel detail-ingredients" aria-labelledby="detail-ingredients-title">
      <h2 id="detail-ingredients-title">Ingredientes</h2>
      <p className="detail-badge" role="status">
        Porciones: {servings} {servings === 1 ? 'persona' : 'personas'}
        {servings === baseServings && ' (base)'}
      </p>
      <div className="detail-servings" role="group" aria-label="Elegir porciones">
        {servingOptions.map((option) => (
          <button className="site-button" type="button" key={option} aria-label={`${option} personas`}
            aria-pressed={servings === option} onClick={() => choose(option)}>
            {option}
          </button>
        ))}
        {!servingOptions.includes(baseServings) && (
          <button className="site-button" type="button" aria-pressed={servings === baseServings}
            onClick={() => choose(baseServings)}>Porciones base</button>
        )}
      </div>
      <form className="detail-servings detail-servings--custom" onSubmit={(event) => {
        event.preventDefault()
        const value = Number(draft)
        if (validServings(value)) choose(value)
      }}>
        <label htmlFor="custom-servings">Porciones (1 a 100)</label>
        <input id="custom-servings" type="number" min={1} max={100} step={1} required
          value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button className="site-button" type="submit">Ajustar</button>
      </form>
      <p role="status">{loading && 'Calculando ingredientes…'}</p>
      {error && <RequestError error={error} onRetry={onRetry} retryLabel="Reintentar ajuste" />}
      {rows?.length > 0 && (
        <ul className="detail-ingredient-list" role="list">
          {rows.map(({ id, name, note, amount }) => (
            <li key={id}>
              <div>
                {name}
                {note && <span className="detail-ingredient-note">{note}</span>}
              </div>
              <strong>{amount}</strong>
            </li>
          ))}
        </ul>
      )}
      {rows?.length === 0 && <p>Aún no hay ingredientes.</p>}
      {rows?.some(({ approximate }) => approximate) && (
        <p className="detail-approximation">
          ≈ 0 indica una cantidad positiva demasiado pequeña para mostrarse con tres decimales.
        </p>
      )}
    </section>
  )
}
