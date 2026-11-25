import { parsePath, UNSAFE_createBrowserHistory } from 'react-router'

function isResetPath(pathname) {
  try {
    return /^\/restablecer-contrasena\/*$/i.test(decodeURIComponent(pathname))
  } catch {
    return false
  }
}

export function parseRecoveryToken(hash) {
  // El contrato es literal: no admite otros parámetros ni codificaciones alternativas.
  return /^#token=([A-Za-z0-9_-]{43})$/u.exec(hash)?.[1] ?? null
}

function createFlow(token, key) {
  if (!token) return null
  const controller = new AbortController()
  return {
    key,
    signal: controller.signal,
    readToken: () => token,
    forgetToken() { token = null },
    discard() {
      token = null
      controller.abort()
    },
  }
}

export function createPasswordRecoveryHistory(browser) {
  function newRecoveryKey() {
    // El historial sobrevive a las recargas. Usa 128 bits aleatorios, no un contador por documento.
    const parts = browser.crypto.getRandomValues(new Uint32Array(4))
    return `recovery-${Array.from(parts, (part) => part.toString(16).padStart(8, '0')).join('')}`
  }

  function scrubLocation() {
    const { pathname, search, hash } = browser.location
    if (!isResetPath(pathname) || (!hash && !search)) return null
    // Renueva la clave incluso en un cambio nativo de hash sin estado de React Router.
    browser.history.replaceState({ ...browser.history.state, key: newRecoveryKey() }, '', pathname)
    return search ? null : parseRecoveryToken(hash)
  }

  let flow = createFlow(scrubLocation(), browser.history.state?.key)
  const history = UNSAFE_createBrowserHistory({ window: browser, v5Compat: true })
  let routerWrite

  function discardFlow() {
    flow?.discard()
    flow = null
  }

  // También elimina el secreto si el documento queda en la caché de navegación.
  browser.addEventListener('pagehide', discardFlow)
  browser.addEventListener('pageshow', (event) => {
    if (event.persisted) discardFlow()
  })

  function write(method, to, state) {
    const path = typeof to === 'string' ? parsePath(to) : to
    if (!isResetPath(path.pathname ?? history.location.pathname)) return history[method](to, state)
    routerWrite = { token: path.search ? null : parseRecoveryToken(path.hash ?? '') }
    try {
      history[method]({ ...path, search: '', hash: '', key: newRecoveryKey() }, state)
    } finally {
      routerWrite = undefined
    }
  }

  return {
    ...history,
    get action() { return history.action },
    get location() { return history.location },
    readResetFlow(key) { return flow?.key === key ? flow : null },
    push: (to, state) => write('push', to, state),
    replace: (to, state) => write('replace', to, state),
    listen(listener) {
      function publish(action, delta) {
        const token = routerWrite ? routerWrite.token : scrubLocation()
        discardFlow()
        const location = history.location
        flow = createFlow(token, location.key)
        listener({ action, delta, location })
      }
      const stop = history.listen(({ action, delta }) => publish(action, delta))
      function onHashChange() {
        // Si popstate ya saneó la entrada, no se consume el flujo una segunda vez.
        if (browser.location.hash && isResetPath(browser.location.pathname)) publish('POP', null)
      }
      browser.addEventListener('hashchange', onHashChange)
      return () => {
        browser.removeEventListener('hashchange', onHashChange)
        stop()
      }
    },
  }
}
