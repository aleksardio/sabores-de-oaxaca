import { ApiError } from './apiClient.js'
import { canceledUpload, mediaLimit, validateMediaFile } from '../utils/multimediaFiles.js'
import { isHttpsMediaUrl } from '../utils/recipeEditorValidation.js'

const errors = {
  400: 'El servidor rechazó el archivo o su formato. Selecciona un archivo válido.',
  401: 'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para subir archivos. Se requiere el rol COCINERO.',
  413: 'El servidor rechazó el archivo por ser demasiado grande.',
  500: 'Ocurrió un error interno durante la subida.',
}
const invalidReceipt = 'El servidor devolvió una respuesta 201 inválida. No se pudo confirmar la subida.'

export function createMultimediaService(requestAuthenticated, user) {
  return {
    async upload(file, signal) {
      if (signal?.aborted) throw new DOMException(canceledUpload, 'AbortError')
      const { type, mime, error } = validateMediaFile(file)
      if (error) throw new ApiError(400, error)
      const body = new FormData()
      const uploadFile = file.type ? file : new File([file], file.name, { type: mime, lastModified: file.lastModified })
      body.append('archivo', uploadFile)
      let receipt
      try {
        receipt = await requestAuthenticated(user, '/multimedia/uploads', {
          method: 'POST', body, expected: 201, signal, errors,
        })
        signal?.throwIfAborted()
      } catch (error) {
        if (signal?.aborted || error.name === 'AbortError') throw new DOMException(canceledUpload, 'AbortError')
        if (error.status === 201) throw new ApiError(201, invalidReceipt)
        if (error.status === 0) throw new ApiError(0, 'Se perdió la conexión. No se pudo confirmar la subida.')
        if (Object.hasOwn(errors, error.status)) throw new ApiError(error.status, errors[error.status])
        throw new ApiError(error.status, 'No se pudo confirmar la subida. Comprueba la API antes de volver a intentar.')
      }
      if (receipt?.tipo !== type || !isHttpsMediaUrl(receipt.url)
        || typeof receipt.nombreOriginal !== 'string' || !receipt.nombreOriginal.trim()
        || !Number.isSafeInteger(receipt.tamanoBytes) || receipt.tamanoBytes <= 0
        || receipt.tamanoBytes > mediaLimit(type)) {
        throw new ApiError(201, invalidReceipt)
      }
      const { tipo, url, nombreOriginal, tamanoBytes } = receipt
      return { tipo, url, nombreOriginal, tamanoBytes }
    },
  }
}
