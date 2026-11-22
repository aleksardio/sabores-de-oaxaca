import assert from 'node:assert/strict'
import test from 'node:test'
import { demoCookRecipes, findDemoCookRecipe, isDemoRecipeEditable, recipeStates } from '../src/data/demoCookRecipes.js'
import { recipes } from '../src/data/recipes.js'
import { validateRecipeForReview } from '../src/utils/recipeEditorValidation.js'

test('solo BORRADOR y RECHAZADA permiten edición en memoria', () => {
  assert.equal(isDemoRecipeEditable('BORRADOR'), true)
  assert.equal(isDemoRecipeEditable('RECHAZADA'), true)
  for (const state of ['PENDIENTE', 'PUBLICADA', 'ARCHIVADA', 'DESCONOCIDA', 'constructor', undefined]) {
    assert.equal(isDemoRecipeEditable(state), false, state)
  }
})

test('no encuentra IDs inexistentes ni del catálogo público', () => {
  assert.equal(findDemoCookRecipe('no-existe'), undefined)
  assert.equal(findDemoCookRecipe('tlayuda'), undefined)
  assert.equal(findDemoCookRecipe('demo-tostadas-calabaza'), demoCookRecipes[0])
})

test('los ejemplos cubren los cinco estados y son independientes del catálogo público', () => {
  assert.deepEqual(new Set(demoCookRecipes.map(({ state }) => state)), new Set(Object.keys(recipeStates)))
  assert.equal(new Set(demoCookRecipes.map(({ id }) => id)).size, demoCookRecipes.length)
  for (const example of demoCookRecipes) {
    assert.ok(!recipes.some(({ id }) => id === example.id))
    assert.deepEqual(validateRecipeForReview(example), {}, example.id)
  }
})
