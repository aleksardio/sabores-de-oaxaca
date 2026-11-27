import { ApiError, apiRequest } from './apiClient.js'
import * as authService from './authService.js'

const emptySession = { user: null, logoutPending: false, logoutError: '', notice: '' }
const unconfirmed = 'No se pudo confirmar la revocación de sesiones en todos los dispositivos.'
const expired = 'Tu sesión venció. Vuelve a iniciar sesión.'

export function createAuthSession() {
  let snapshot = emptySession
  let token
  let expiryTimer
  let pendingLogin
  let pendingLogout
  const listeners = new Set()

  function update(next) {
    snapshot = next
    for (const listener of listeners) listener()
  }

  function clear(notice = '') {
    token = undefined
    clearTimeout(expiryTimer)
    pendingLogin?.abort()
    pendingLogin = undefined
    pendingLogout?.abort()
    pendingLogout = undefined
    update({ ...emptySession, notice })
  }

  async function completeSignIn(loginRequest, signal) {
    if (token || (pendingLogin && !pendingLogin.signal.aborted)) {
      throw new ApiError(0, 'Ya hay una sesión activa o un inicio de sesión en curso.')
    }
    const attempt = new AbortController()
    // El bloqueo también se libera si la pantalla que inició el envío se desmonta.
    signal?.throwIfAborted()
    const cancel = () => attempt.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    pendingLogin = attempt
    const requestSignal = attempt.signal
    try {
      const result = await loginRequest(requestSignal)
      requestSignal.throwIfAborted()
      const deadline = Date.now() + result.expiraEnSegundos * 1000
      const user = await authService.getProfile(result.token, requestSignal)
      requestSignal.throwIfAborted()
      if (pendingLogin !== attempt) return
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new ApiError(401, expired)

      token = result.token
      expiryTimer = setTimeout(() => {
        clear(pendingLogout || snapshot.logoutError ? `${expired} ${unconfirmed}` : expired)
      }, remaining)
      update({ ...emptySession, user })
    } finally {
      signal?.removeEventListener('abort', cancel)
      // El JWT provisional de login nunca entra a la sesión si /me falla.
      if (pendingLogin === attempt) pendingLogin = undefined
    }
  }

  function signIn(values, signal) {
    return completeSignIn(
      (requestSignal) => authService.login(values, requestSignal), signal)
  }

  function signInWithGoogle(credential, signal) {
    return completeSignIn(
      (requestSignal) => authService.loginGoogle(credential, requestSignal), signal)
  }

  async function signOut() {
    if (!token || pendingLogout) return false
    const attempt = new AbortController()
    pendingLogout = attempt
    update({ ...snapshot, logoutPending: true, logoutError: '' })
    try {
      await authService.logout(token, attempt.signal)
      if (pendingLogout !== attempt) return false
      clear('Sesión cerrada en todos los dispositivos.')
      return true
    } catch (error) {
      if (pendingLogout !== attempt) return false
      if (error instanceof ApiError && error.status === 401) {
        clear(`Tu sesión ya no es válida. ${unconfirmed} Vuelve a iniciar sesión.`)
        return true
      }
      pendingLogout = undefined
      const message = error instanceof ApiError ? error.message : 'No se pudo cerrar la sesión en el servidor.'
      update({ ...snapshot, logoutPending: false, logoutError: `${message} ${unconfirmed}` })
      return false
    }
  }

  async function requestAuthenticated(user, path, options) {
    if (!token || snapshot.user !== user) throw new ApiError(401, expired)
    const { discardStaleErrors, ...requestOptions } = options ?? {}
    try {
      const result = await apiRequest(path, { ...requestOptions, token })
      if (snapshot.user !== user) throw new DOMException('La sesión cambió.', 'AbortError')
      return result
    } catch (error) {
      if (discardStaleErrors) {
        requestOptions.signal?.throwIfAborted()
        if (snapshot.user !== user) throw new DOMException('La sesión cambió.', 'AbortError')
      }
      // Un 401 tardío de una sesión anterior no debe cerrar la sesión actual.
      if (error instanceof ApiError && error.status === 401 && snapshot.user === user) {
        const notice = pendingLogout ? `${error.message} ${unconfirmed}` : error.message
        clear(notice)
      }
      throw error
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    signIn,
    signInWithGoogle,
    signOut,
    requestAuthenticated,
    requireFreshSignIn(user, notice) {
      if (snapshot.user === user && token) clear(notice)
    },
    leaveLocally() {
      if (!snapshot.logoutError) return false
      clear(`Saliste de este navegador. ${unconfirmed}`)
      return true
    },
    dispose: clear,
  }
}
