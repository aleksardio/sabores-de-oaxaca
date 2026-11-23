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

export function ingredientRows(ingredients, adjusted) {
  return [...ingredients].sort((a, b) => a.orden - b.orden).map((ingredient) => {
    const { cantidadBase, cantidadAjustada, unidad } = ingredient
    const quantity = adjusted ? cantidadAjustada : cantidadBase
    const approximate = adjusted && quantity === 0 && cantidadBase > 0
    const [singular, plural = singular] = Object.hasOwn(unitLabels, unidad) ? unitLabels[unidad] : [unidad]
    const amount = quantity === null
      ? 'Al gusto'
      : `${approximate ? '≈ ' : ''}${String(quantity).replace('.', ',')} ${quantity === 1 ? singular : plural}`
    return { id: ingredient.id, name: ingredient.nombre, note: ingredient.nota, amount, approximate }
  })
}

export function recipeImage(multimedia) {
  for (const item of [...multimedia].sort((a, b) => a.orden - b.orden)) {
    if (item.tipo !== 'IMAGEN' || !item.url) continue
    try {
      const url = new URL(item.url)
      const hostname = url.hostname.replace(/\.$/, '')
      if (url.protocol === 'https:' && !url.username && !url.password && !/(^|\.)invalid$/.test(hostname)) {
        return { src: url.href, alt: item.textoAlternativo?.trim() }
      }
    } catch {
      // Skip malformed or missing image URLs.
    }
  }
  return null
}
