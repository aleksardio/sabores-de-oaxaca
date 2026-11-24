import { moderationReasonLimit } from './moderationRules.js'

export function canModerate(user) {
  return user?.roles?.some((role) => role === 'MODERADOR' || role === 'ADMIN') ?? false
}

export function isOwnModerationRecipe(user, recipe) {
  return Boolean(user && recipe && user.id === recipe.autorId)
}

export function validateRejectionReason(reason) {
  const trimmed = reason.trim()
  if (!trimmed) return 'Escribe el motivo del rechazo.'
  if (trimmed.length > moderationReasonLimit) return `El motivo no debe superar ${moderationReasonLimit} caracteres sin contar espacios extremos.`
  return ''
}
