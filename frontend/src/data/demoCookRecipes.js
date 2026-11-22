// Ejemplos independientes del catálogo público y de los perfiles de autor.
export const recipeStates = {
  BORRADOR: { label: 'Borrador', editable: true },
  PENDIENTE: { label: 'Pendiente', note: 'La receta está en revisión. No se puede editar su contenido.' },
  PUBLICADA: { label: 'Publicada', note: 'Para editarla, primero debe retirarse a borrador. El retiro no está disponible sin el servidor.' },
  RECHAZADA: { label: 'Rechazada', editable: true, note: 'Puedes practicar las correcciones aquí. Reabrir la receta como borrador requiere el servidor.' },
  ARCHIVADA: { label: 'Archivada', note: 'Solo moderación puede restaurarla para una nueva revisión. Esta operación requiere el servidor.' },
}

function ingredient(id, name, quantity, unit, note = '') {
  return { id, name, quantity, unit, note }
}

export const demoCookRecipes = [
  {
    id: 'demo-tostadas-calabaza',
    state: 'BORRADOR',
    title: 'Tostadas de calabaza asada',
    description: 'Calabaza tierna con un toque de limón sobre tostadas crujientes.',
    type: 'COMUN',
    categories: ['Antojitos'],
    baseServings: '4',
    ingredients: [
      ingredient(1, 'Calabaza', '350', 'G', 'Cortada en cubos'),
      ingredient(2, 'Tostadas', '8', 'PIEZA'),
      ingredient(3, 'Jugo de limón', '1.5', 'CUCHARADA'),
      ingredient(4, 'Sal', null, 'AL_GUSTO'),
    ],
    preparation: 'Asa la calabaza hasta que esté tierna.\nMézclala con limón y sal, y distribúyela sobre las tostadas.',
  },
  {
    id: 'demo-infusion-guayaba',
    state: 'PENDIENTE',
    title: 'Infusión de guayaba y canela',
    description: 'Una bebida caliente con fruta y especias.',
    type: 'COMUN',
    categories: ['Bebidas'],
    baseServings: '3',
    ingredients: [ingredient(1, 'Guayaba', '4', 'PIEZA'), ingredient(2, 'Agua', '750', 'ML'), ingredient(3, 'Canela', '1', 'PIEZA', 'Una raja')],
    preparation: 'Hierve el agua con la canela.\nAñade la guayaba troceada, deja reposar y cuela antes de servir.',
  },
  {
    id: 'demo-quesadillas-flor',
    state: 'PUBLICADA',
    title: 'Quesadillas de flor de calabaza',
    description: 'Un ejemplo de antojito de comal con flor de calabaza y quesillo.',
    type: 'TRADICIONAL_OAXAQUENA',
    categories: ['Antojitos', 'Platos principales'],
    baseServings: '2',
    ingredients: [ingredient(1, 'Tortillas', '4', 'PIEZA'), ingredient(2, 'Flor de calabaza', '120', 'G'), ingredient(3, 'Quesillo', '100', 'G')],
    preparation: 'Limpia y saltea las flores.\nRellena las tortillas con las flores y el quesillo. Dóblalas y caliéntalas en un comal.',
  },
  {
    id: 'demo-dulce-amaranto',
    state: 'RECHAZADA',
    title: 'Dulce de amaranto y naranja',
    description: 'Bocaditos de amaranto con ralladura de naranja.',
    type: 'COMUN',
    categories: ['Dulces'],
    baseServings: '6',
    ingredients: [ingredient(1, 'Amaranto inflado', '2', 'TAZA'), ingredient(2, 'Miel', '3', 'CUCHARADA'), ingredient(3, 'Ralladura de naranja', '1', 'CUCHARADITA')],
    preparation: 'Mezcla el amaranto con la miel y la ralladura.\nPresiona en un molde y corta en porciones.',
  },
  {
    id: 'demo-caldo-garbanzos',
    state: 'ARCHIVADA',
    title: 'Caldo de garbanzos con hierbas',
    description: 'Caldo casero con garbanzo y hierbas frescas.',
    type: 'COMUN',
    categories: ['Sopas y caldos'],
    baseServings: '4',
    ingredients: [ingredient(1, 'Garbanzos cocidos', '400', 'G'), ingredient(2, 'Caldo de verduras', '1', 'L'), ingredient(3, 'Perejil', null, 'AL_GUSTO', 'Picado')],
    preparation: 'Calienta el caldo y añade los garbanzos.\nDeja hervir unos minutos y termina con perejil.',
  },
]

export function findDemoCookRecipe(id) {
  return demoCookRecipes.find((recipe) => recipe.id === id)
}

export function isDemoRecipeEditable(state) {
  return Object.hasOwn(recipeStates, state) && recipeStates[state].editable === true
}
