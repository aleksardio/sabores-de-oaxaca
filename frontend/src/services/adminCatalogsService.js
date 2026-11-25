import { getCategories, getIngredients } from './recipesService.js'

export async function getAdminCatalogs(signal) {
  const [categories, ingredients] = await Promise.all([getCategories(signal), getIngredients(signal)])
  signal?.throwIfAborted()
  return { categories, ingredients }
}
