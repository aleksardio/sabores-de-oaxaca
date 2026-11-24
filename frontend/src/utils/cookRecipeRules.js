export const recipeStates = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  PUBLICADA: 'Publicada',
  RECHAZADA: 'Rechazada',
  ARCHIVADA: 'Archivada',
}

export const canWriteRecipes = (user) => user?.roles?.includes('COCINERO') === true
export const canDeleteRecipe = (user, recipe) =>
  canWriteRecipes(user) && recipe?.eliminadoEn === null && Object.hasOwn(recipeStates, recipe.estado)
export const isReviewableRecipe = (recipe) =>
  recipe?.eliminadoEn === null && ['BORRADOR', 'RECHAZADA'].includes(recipe.estado)
export const canEditRecipe = (user, recipe) =>
  canWriteRecipes(user) && isReviewableRecipe(recipe)
export const canReviewRecipe = (user, recipe) =>
  canWriteRecipes(user) && isReviewableRecipe(recipe)
