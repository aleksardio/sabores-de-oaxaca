import { useState } from 'react'
import { scaleIngredients } from '../utils/servings.js'

const servingOptions = [2, 4, 6]
const unitLabels = {
  G: ['g'],
  KG: ['kg'],
  ML: ['ml'],
  L: ['l'],
  PIEZA: ['pieza', 'piezas'],
  CUCHARADA: ['cucharada', 'cucharadas'],
  CUCHARADITA: ['cucharadita', 'cucharaditas'],
  TAZA: ['taza', 'tazas'],
}

function formatAmount({ quantity, unit, isApproximateZero }) {
  if (unit === 'AL_GUSTO') return 'Al gusto'
  const [singular, plural = singular] = unitLabels[unit]
  const label = quantity === '1' ? singular : plural
  return `${isApproximateZero ? '≈ ' : ''}${quantity.replace('.', ',')} ${label}`
}

export default function ServingsCalculator({ ingredients, baseServings }) {
  const [servings, setServings] = useState(baseServings)
  const scaledIngredients = scaleIngredients(ingredients, baseServings, servings)
  const people = servings === 1 ? 'persona' : 'personas'

  return (
    <section className="detail-panel detail-ingredients" aria-labelledby="detail-ingredients-title">
      <h2 id="detail-ingredients-title">Ingredientes</h2>
      <p className="detail-badge" role="status">Porciones: {servings} {people}</p>
      <div className="detail-servings" role="group" aria-label="Elegir porciones">
        {servingOptions.map((option) => (
          <button
            className="site-button"
            type="button"
            key={option}
            aria-label={`${option} personas`}
            aria-pressed={servings === option}
            onClick={() => setServings(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <ul className="detail-ingredient-list" role="list">
        {scaledIngredients.map((ingredient) => (
          <li key={ingredient.order}>
            <div>
              {ingredient.name}
              {ingredient.note && <span className="detail-ingredient-note">{ingredient.note}</span>}
            </div>
            <strong>{formatAmount(ingredient)}</strong>
          </li>
        ))}
      </ul>
      {scaledIngredients.some(({ isApproximateZero }) => isApproximateZero) && (
        <p className="detail-approximation" role="status">
          ≈ 0 indica una cantidad positiva demasiado pequeña para mostrarse con tres decimales.
        </p>
      )}
    </section>
  )
}
