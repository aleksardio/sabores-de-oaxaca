import { ApiError, apiRequest } from './apiClient.js'

export function register(values, signal) {
  return apiRequest('/auth/registro', {
    method: 'POST',
    expected: 201,
    body: {
      nombreVisible: values.get('displayName'),
      correo: values.get('email'),
      contrasena: values.get('password'),
    },
    signal,
    errors: { 409: 'El correo ya está registrado.' },
  })
}

export async function login(values, signal) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: { correo: values.get('email'), contrasena: values.get('password') },
    signal,
    errors: { 401: 'El correo o la contraseña no son correctos.' },
  })
  if (typeof result?.token !== 'string' || !result.token || result.tipo !== 'Bearer'
    || !Number.isInteger(result.expiraEnSegundos) || result.expiraEnSegundos <= 0) {
    throw new ApiError(200, 'El servidor no devolvió una sesión válida.')
  }
  return result
}

function requireToken(token) {
  if (!token) throw new ApiError(401, 'Tu sesión ya no es válida. Vuelve a iniciar sesión.')
}

export async function getProfile(token, signal) {
  requireToken(token)
  const profile = await apiRequest('/auth/me', {
    token,
    signal,
    errors: { 403: 'El servidor no autorizó el acceso al perfil.' },
  })
  if (!Number.isInteger(profile?.id) || typeof profile.nombreVisible !== 'string'
    || typeof profile.correo !== 'string' || !Array.isArray(profile.roles)
    || !profile.roles.every((role) => typeof role === 'string')) {
    throw new ApiError(200, 'El servidor no devolvió un perfil válido.')
  }
  return profile
}

export function logout(token, signal) {
  requireToken(token)
  return apiRequest('/auth/logout', {
    method: 'POST',
    expected: 204,
    token,
    signal,
    errors: { 409: 'La cuenta cambió mientras se cerraba la sesión.' },
  })
}
