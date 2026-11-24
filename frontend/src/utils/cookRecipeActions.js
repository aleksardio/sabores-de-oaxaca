import { isReviewableRecipe } from './cookRecipeRules.js'

// Acquire synchronously: two events can arrive before React disables the buttons.
export function createRecipeOperation() {
  let active
  let owner
  return {
    get busy() { return Boolean(active) },
    start(key) {
      if (active) return null
      owner = key
      active = new AbortController()
      return active
    },
    finish(attempt) {
      if (active === attempt) active = undefined
    },
    cancel(key) {
      if (!active || (key !== undefined && key !== owner)) return false
      active.abort()
      active = undefined
      return true
    },
  }
}

export async function saveAndRequestReview(service, record, body, signal, onSaved) {
  if (!isReviewableRecipe(record)) return null
  if (body) {
    const receipt = await service.update(record.id, body, record.version, signal)
    record = { ...record, ...receipt }
    onSaved(record)
    if (!isReviewableRecipe(record)) return null
  }
  return service.review(record.id, record.version, signal)
}

export function resolveRecipeConflict(local, serverDraft, keepLocal) {
  return { draft: keepLocal ? local : serverDraft, baseline: serverDraft }
}
