// Referencia para probar autoría y reportante. No representa una cuenta ni una sesión.
export const demoReviewerId = 'persona-referencia'

export const moderationRecipeStates = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  PUBLICADA: 'Publicada',
  RECHAZADA: 'Rechazada',
  ARCHIVADA: 'Archivada',
}

const authors = {
  ines: { id: 'autora-ines', name: 'Inés del Río' },
  mateo: { id: 'autor-mateo', name: 'Mateo Luz' },
  reference: { id: demoReviewerId, name: 'Paloma Sierra' },
}

function ingredient(id, name, quantity, unit, note = '') {
  return { id, name, quantity, unit, note }
}

export const demoModerationRecipes = [
  {
    id: 'demo-tamales-hongos',
    title: 'Tamales de hongos y hoja santa',
    author: authors.ines,
    state: 'PENDIENTE',
    type: 'TRADICIONAL_OAXAQUENA',
    categories: ['Antojitos'],
    baseServings: '6',
    description: 'Masa de maíz envuelta en hojas con un relleno de hongos salteados.',
    ingredients: [
      ingredient(1, 'Masa de maíz', '500', 'G'),
      ingredient(2, 'Hongos', '250', 'G', 'Picados'),
      ingredient(3, 'Hoja santa', '6', 'PIEZA'),
      ingredient(4, 'Hojas de maíz', '6', 'PIEZA', 'Remojadas'),
    ],
    preparation: 'Saltea los hongos con la hoja santa picada.\nReparte la masa en las hojas de maíz y agrega el relleno.\nCierra los tamales y cuécelos al vapor hasta que la masa se desprenda de la hoja.',
  },
  {
    id: 'demo-crema-milpa',
    title: 'Crema de milpa con elote',
    author: authors.reference,
    state: 'PENDIENTE',
    type: 'COMUN',
    categories: ['Sopas y caldos'],
    baseServings: '4',
    description: 'Sopa suave de elote con calabacita y caldo de verduras.',
    ingredients: [
      ingredient(1, 'Elote desgranado', '300', 'G'),
      ingredient(2, 'Calabacita', '200', 'G'),
      ingredient(3, 'Caldo de verduras', '700', 'ML'),
    ],
    preparation: 'Cuece el elote y la calabacita en el caldo.\nLicúa con cuidado hasta obtener una crema.',
  },
  {
    id: 'demo-agua-ciruela',
    title: 'Agua de ciruela con hierbabuena',
    author: authors.mateo,
    state: 'PUBLICADA',
    type: 'COMUN',
    categories: ['Bebidas'],
    baseServings: '4',
    description: 'Agua fresca de ciruela madura con hierbabuena.',
    ingredients: [
      ingredient(1, 'Ciruela', '350', 'G', 'Sin hueso'),
      ingredient(2, 'Agua', '1', 'L'),
      ingredient(3, 'Hierbabuena', null, 'AL_GUSTO'),
    ],
    preparation: 'Licúa la pulpa de ciruela con el agua y cuela.\nAñade hierbabuena y sirve fría.',
  },
  {
    id: 'demo-frijoles-quelites',
    title: 'Frijoles con quelites de comal',
    author: authors.ines,
    state: 'ARCHIVADA',
    type: 'COMUN',
    categories: ['Platos principales'],
    baseServings: '3',
    description: 'Frijoles de olla con quelites y tortillas calientes.',
    ingredients: [
      ingredient(1, 'Frijoles cocidos', '2', 'TAZA'),
      ingredient(2, 'Quelites', '150', 'G'),
      ingredient(3, 'Tortillas', '6', 'PIEZA'),
    ],
    preparation: 'Saltea los quelites y mézclalos con los frijoles calientes.\nSirve con tortillas recién calentadas en el comal.',
  },
  {
    id: 'demo-merienda-papaya',
    title: 'Papaya asada con limón',
    author: authors.mateo,
    state: 'BORRADOR',
    type: 'COMUN',
    categories: ['Dulces'],
    baseServings: '2',
    description: 'Papaya tibia, dorada en comal y servida con limón.',
    ingredients: [ingredient(1, 'Papaya', '300', 'G'), ingredient(2, 'Limón', '1', 'PIEZA')],
    preparation: 'Dora la papaya en el comal y sirve con jugo de limón.',
  },
  {
    id: 'demo-arroz-ajonjoli',
    title: 'Arroz tostado con ajonjolí',
    author: authors.ines,
    state: 'RECHAZADA',
    type: 'COMUN',
    categories: ['Platos principales'],
    baseServings: '3',
    description: 'Arroz dorado con semillas de ajonjolí tostadas.',
    ingredients: [ingredient(1, 'Arroz', '1', 'TAZA'), ingredient(2, 'Agua', '2', 'TAZA'), ingredient(3, 'Ajonjolí', '1', 'CUCHARADA')],
    preparation: 'Tuesta el arroz y cuécelo con el agua.\nAñade el ajonjolí tostado al servir.',
  },
]

export function findDemoModerationRecipe(id) {
  return demoModerationRecipes.find((recipe) => recipe.id === id)
}
