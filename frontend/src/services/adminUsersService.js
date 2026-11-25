import { adminUserId, adminUserRoles, canAdminister } from '../utils/adminAccess.js'
import { ApiError } from './apiClient.js'

export const adminUsersPageSize = 20
export const adminUsersTextLimit = 100
const base = '/admin/usuarios'
const writesByUser = new WeakMap()
const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0
const isRole = (role) => adminUserRoles.includes(role)
const errors = {
  400: 'Los parámetros de administración no son válidos.',
  403: 'Acceso denegado. Se requiere autorización de administrador.',
  404: 'El usuario no existe.',
  409: 'La cuenta está inactiva. No se pueden cambiar sus roles.',
  500: 'El servidor no pudo completar la solicitud. Inténtalo más tarde.',
}

export function adminUsersErrorMessage(error) {
  if (!(error instanceof ApiError)) return 'No se pudo completar la solicitud.'
  if (error.status === 400) return error.message
  return errors[error.status] ?? (error.status === 0 ? 'No se pudo conectar con el servidor.'
    : error.status === 401 ? 'Tu sesión ya no es válida. Vuelve a iniciar sesión.'
      : error.status >= 500 ? errors[500] : 'El servidor devolvió una respuesta inesperada.')
}

export function adminRegistrationUtc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z?$/u.test(value)) return null
  const iso = value.endsWith('Z') ? value : `${value}Z`
  const timestamp = Date.parse(iso)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 19) === iso.slice(0, 19) ? iso : null
}

const isUser = (row) => typeof row?.id === 'number' && adminUserId(row.id) !== null
  && typeof row.nombreVisible === 'string' && typeof row.correo === 'string' && typeof row.activo === 'boolean'
  && adminRegistrationUtc(row.creadoEn) !== null && Array.isArray(row.roles) && row.roles.every(isRole)
  && new Set(row.roles).size === row.roles.length

export function cookRoleAction(account) {
  if (account?.activo !== true) return null
  return account.roles.includes('COCINERO') ? 'Retirar rol COCINERO' : 'Asignar rol COCINERO'
}

export const roleRefreshMessages = {
  confirmed: 'El servidor confirmó el cambio de rol.',
  uncertain: 'No se pudo confirmar la respuesta del cambio.',
  inactive: 'El servidor rechazó el cambio porque la cuenta estaba inactiva.',
}

const needsReconciliation = (error) => !(error instanceof ApiError)
  || error.status === 0 || error.status === 408 || error.status >= 500 || (error.status >= 200 && error.status < 300)

export function createAdminUsersService(requestAuthenticated, user, requireFreshSignIn) {
  const writes = user ? (writesByUser.get(user) ?? new Map()) : new Map()
  if (user) writesByUser.set(user, writes)

  async function request(path, options, validate) {
    if (!user) throw new ApiError(401, 'Inicia sesión para administrar usuarios.')
    if (!canAdminister(user)) throw new ApiError(403, errors[403])
    options.signal?.throwIfAborted()
    const data = await requestAuthenticated(user, path, { ...options, errors: { ...errors, ...options.errors }, discardStaleErrors: true })
    options.signal?.throwIfAborted()
    if (!validate(data)) throw new ApiError(200, 'El servidor devolvió una respuesta inesperada.')
    return data
  }

  function pathFor(id) {
    if (typeof id !== 'number' || adminUserId(id) === null) throw new ApiError(400, 'El ID de usuario no es válido.')
    return `${base}/${id}`
  }

  function readDetail(id, options) {
    return request(pathFor(id), options, (data) => isUser(data) && data.id === id)
  }

  async function writeAndReconcile(account, path) {
    let kind = 'confirmed'
    try {
      await request(`${path}/roles/cocinero`, {
        method: account.roles.includes('COCINERO') ? 'DELETE' : 'PUT', expected: 204,
      }, (data) => data === undefined)
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (error instanceof ApiError && error.status === 409) kind = 'inactive'
      else if (needsReconciliation(error)) kind = 'uncertain'
      else throw error
    }

    let refreshPending = false
    try {
      const invalidSession = `${roleRefreshMessages[kind]} La actualización visual está pendiente. Tu sesión ya no es válida. Vuelve a iniciar sesión.`
      return { kind, account: await readDetail(account.id, { errors: { 401: invalidSession } }) }
    } catch (error) {
      if (error.name === 'AbortError' || error.status === 401) throw error
      refreshPending = true
      return { kind, error }
    } finally {
      if (user.id === account.id && kind !== 'inactive') {
        const pending = refreshPending ? ' La actualización visual está pendiente.' : ''
        requireFreshSignIn?.(user, `${roleRefreshMessages[kind]}${pending} Vuelve a iniciar sesión para consultar tus permisos actuales.`)
      }
    }
  }

  return {
    async list({ texto = '', rol = '', activo, pagina = 0 } = {}, signal) {
      if (typeof texto !== 'string' || texto.length > adminUsersTextLimit || (rol !== '' && !isRole(rol))
        || (activo !== undefined && typeof activo !== 'boolean') || !nonnegative(pagina)
        || pagina * adminUsersPageSize > 2147483647) {
        throw new ApiError(400, errors[400])
      }
      const query = new URLSearchParams({ pagina, tamano: adminUsersPageSize })
      if (texto !== '') query.set('texto', texto)
      if (rol !== '') query.set('rol', rol)
      if (activo !== undefined) query.set('activo', String(activo))
      return request(`${base}?${query}`, { signal }, (data) => Array.isArray(data?.contenido)
        && data.contenido.length <= adminUsersPageSize && data.contenido.every(isUser)
        && new Set(data.contenido.map(({ id }) => id)).size === data.contenido.length
        && data.pagina === pagina && data.tamano === adminUsersPageSize
        && nonnegative(data.totalElementos) && nonnegative(data.totalPaginas)
        && data.totalPaginas === Math.ceil(data.totalElementos / adminUsersPageSize)
        && data.contenido.length <= Math.max(0, data.totalElementos - pagina * adminUsersPageSize))
    },
    async detail(id, signal) {
      pathFor(id)
      const pending = writes.get(id)
      if (pending) {
        // Un reingreso al detalle no debe habilitar otra operación antes de la anterior.
        await Promise.allSettled([pending])
      }
      return readDetail(id, { signal })
    },
    async changeCookRole(account, { confirmed = false } = {}) {
      if (!confirmed || !isUser(account)) throw new ApiError(400, 'Consulta la cuenta y confirma el cambio de rol.')
      if (!account.activo) throw new ApiError(409, errors[409])
      const path = pathFor(account.id)
      if (writes.has(account.id)) throw new ApiError(409, 'Ya hay un cambio de rol en curso.')
      const submission = writeAndReconcile(account, path)
      writes.set(account.id, submission)
      try {
        return await submission
      } finally {
        writes.delete(account.id)
      }
    },
  }
}
