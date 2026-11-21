const numericUnits = new Set([
  'G', 'KG', 'ML', 'L', 'PIEZA', 'CUCHARADA', 'CUCHARADITA', 'TAZA',
])
const scale = 1000n

function toThousandths(quantity) {
  // DECIMAL(12,3): up to nine integer digits and three fractional digits.
  const decimal = typeof quantity === 'number' ? String(quantity) : quantity
  const match = typeof decimal === 'string' && /^(\d{1,9})(?:\.(\d{1,3}))?$/.exec(decimal)
  if (!match) throw new RangeError('La cantidad debe ajustarse a DECIMAL(12,3).')
  const [, whole, fraction = ''] = match
  const value = BigInt(whole) * scale + BigInt(fraction.padEnd(3, '0'))
  if (value === 0n) throw new RangeError('La cantidad debe ser positiva.')
  return value
}

function formatThousandths(value) {
  const whole = value / scale
  const fraction = String(value % scale).padStart(3, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : String(whole)
}

// Returns new rows with display-ready decimal strings; never scales those strings again.
export function scaleIngredients(ingredients, baseServings, requestedServings) {
  for (const servings of [baseServings, requestedServings]) {
    if (!Number.isSafeInteger(servings) || servings < 1) {
      throw new RangeError('Las porciones deben ser enteros positivos seguros.')
    }
  }

  const divisor = BigInt(baseServings)
  const multiplier = BigInt(requestedServings)

  return [...ingredients].sort((a, b) => a.order - b.order).map((ingredient) => {
    const { quantity, unit } = ingredient
    if (unit === 'AL_GUSTO') {
      if (quantity !== null) throw new TypeError('AL_GUSTO requiere una cantidad nula.')
      return { ...ingredient, isApproximateZero: false }
    }
    if (!numericUnits.has(unit)) throw new RangeError('Unidad de ingrediente no admitida.')

    const numerator = toThousandths(quantity) * multiplier
    const remainder = numerator % divisor
    // Positive amounts: add one thousandth on an exact half or above.
    const rounded = numerator / divisor + (2n * remainder >= divisor ? 1n : 0n)
    return { ...ingredient, quantity: formatThousandths(rounded), isApproximateZero: rounded === 0n }
  })
}
