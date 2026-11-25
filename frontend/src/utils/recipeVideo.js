import { isHttpsMediaUrl } from './recipeEditorValidation.js'

const publicMediaOrigin = 'https://media.saboresdeoaxaca.food'

export function remoteVideoSource(value) {
  if (!isHttpsMediaUrl(value)) return null
  const url = new URL(value)
  return url.origin === publicMediaOrigin ? url.href : null
}
