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
export const canEditRecipe = (user, recipe) =>
  canDeleteRecipe(user, recipe) && ['BORRADOR', 'RECHAZADA'].includes(recipe.estado)
export const canReviewRecipe = (user, recipe) =>
  canEditRecipe(user, recipe) && recipe.estado === 'BORRADOR'
