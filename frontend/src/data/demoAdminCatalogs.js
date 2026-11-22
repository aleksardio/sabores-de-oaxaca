import { demoRecipeCategories } from './recipeEditorOptions.js'

const descriptions = {
  Antojitos: 'Preparaciones ligeras para compartir.',
  Bebidas: 'Preparaciones líquidas frías o calientes.',
  Dulces: 'Postres y preparaciones dulces.',
  Ensaladas: 'Preparaciones frescas o templadas a base de vegetales.',
  'Platos principales': 'Preparaciones para el centro de la mesa.',
  'Sopas y caldos': 'Preparaciones servidas con su caldo.',
}

export const demoAdminCategories = demoRecipeCategories.map((name, index) => ({
  id: `CAT-0${index + 1}`,
  name,
  description: descriptions[name],
}))

export const demoAdminIngredients = [
  'Maíz', 'Nopal', 'Quesillo', 'Chile pasilla', 'Epazote', 'Frijol negro', 'Piloncillo', 'Cacao',
].map((name, index) => ({ id: `ING-0${index + 1}`, name }))
