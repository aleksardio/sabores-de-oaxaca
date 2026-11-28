const apiBase = '/api/v1'
const fieldNames = { correo: 'email', nombreVisible: 'displayName', contrasena: 'password' }
const messages = {
  400: 'Revisa los datos del formulario.',
  401: 'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
  403: 'No tienes autorización para realizar esta acción.',
  409: 'Los datos cambiaron durante la operación.',
  502: 'No se pudo contactar con la API. Comprueba que el servidor esté disponible.',
  503: 'La API no está disponible en este momento.',
  504: 'La API tardó demasiado en responder.',
}

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export async function apiRequest(path, { method = 'GET', body, token, signal, errors, expected = 200, ifMatch, badRequest, conflicts } = {}) {
  const headers = { Accept: 'application/json' }
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (ifMatch !== undefined) headers['If-Match'] = ifMatch

  let response
  try {
    response = await fetch(`${apiBase}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined || multipart ? body : JSON.stringify(body),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    })
  } catch {
    signal?.throwIfAborted()
    throw new ApiError(0, 'No pudimos conectar con el servidor. Comprueba tu conexión.')
  }

  if (multipart) signal?.throwIfAborted()
  if (response.ok && response.status !== expected) {
    throw new ApiError(response.status, 'El servidor devolvió una respuesta inesperada.')
  }
  if (response.status === 204) return

  let data
  if (response.ok || response.status === 400 || (response.status === 409 && conflicts)) {
    try {
      data = await response.json()
    } catch {
      signal?.throwIfAborted()
      if (response.ok) throw new ApiError(response.status, 'El servidor devolvió una respuesta inesperada.')
    }
  }
  if (multipart) signal?.throwIfAborted()
  if (response.ok) return data

  const fields = {}
  if (response.status === 400) {
    if (badRequest) throw badRequest(data)
    for (const [source, target] of Object.entries(fieldNames)) {
      const message = data?.campos?.[source]
      if (typeof message === 'string' && message) fields[target] = message
    }
  }
  throw new ApiError(
    response.status,
    (response.status === 409 && typeof data?.codigo === 'string' && Object.hasOwn(conflicts ?? {}, data.codigo) ? conflicts[data.codigo] : undefined)
      ?? errors?.[response.status] ?? messages[response.status] ?? 'El servidor no pudo completar la operación. Comprueba que la API esté disponible.',
    fields,
  )
}
