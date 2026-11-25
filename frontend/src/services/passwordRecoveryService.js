import { ApiError, apiRequest } from './apiClient.js'
import { normalizeRecoveryEmail } from '../utils/authValidation.js'

export const recoveryConfirmation = 'Si la cuenta existe, recibirá instrucciones de recuperación'
const resetConfirmation = 'Contraseña actualizada'
const invalidLink = 'Enlace inválido o vencido'
const uncertain = 'No se pudo confirmar la operación.'
const commonErrors = {
  429: 'Se realizaron demasiadas solicitudes. Espera antes de intentarlo nuevamente.',
  503: 'La recuperación de contraseña no está disponible temporalmente. Inténtalo más tarde.',
}
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

export class InvalidRecoveryLink extends ApiError {
  constructor() {
    super(400, 'El enlace no es válido, ya se usó o venció. Solicita uno nuevo.')
  }
}

async function post(path, body, signal, message, badRequest, uncertainMessage) {
  signal?.throwIfAborted()
  const origin = globalThis.location
  if (origin && origin.protocol !== 'https:' && !(origin.protocol === 'http:' && localHosts.has(origin.hostname))) {
    throw new ApiError(0, 'Abre el sitio mediante HTTPS para usar la recuperación de contraseña.')
  }
  try {
    const data = await apiRequest(`/auth/${path}`, { method: 'POST', body, signal, badRequest })
    signal?.throwIfAborted()
    if (data?.mensaje !== message || Object.keys(data).length !== 1) throw new ApiError(200, uncertainMessage)
  } catch (error) {
    signal?.throwIfAborted()
    if (error instanceof ApiError && error.status === 400) throw error
    const status = error instanceof ApiError ? error.status : 0
    throw new ApiError(status, commonErrors[status] ?? uncertainMessage)
  }
}

export function requestPasswordRecovery(values, signal) {
  return post('recuperar-contrasena', { correo: normalizeRecoveryEmail(values.get('email')) },
    signal, recoveryConfirmation, (data) => new ApiError(400, 'Revisa el correo y los datos enviados.',
      typeof data?.campos?.correo === 'string' ? { email: 'Revisa el formato del correo electrónico.' } : {}),
    `${uncertain} Revisa tu conexión o inténtalo más tarde.`)
}

export function resetPassword(token, values, signal) {
  return post('restablecer-contrasena', { token, contrasena: values.get('password') },
    signal, resetConfirmation, (data) => {
      if (data?.error === invalidLink || typeof data?.campos?.token === 'string') return new InvalidRecoveryLink()
      if (typeof data?.campos?.contrasena === 'string') {
        return new ApiError(400, 'Revisa la nueva contraseña.', { password: 'La contraseña no cumple los requisitos.' })
      }
      return new ApiError(400, 'No se pudo aceptar la solicitud. Revisa los datos o solicita otro enlace.')
    }, `${uncertain} Intenta iniciar sesión con la nueva contraseña o solicita otro enlace.`)
}
