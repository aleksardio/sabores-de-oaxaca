const publicDestination = /^\/(?:perfil|favoritos|recetas(?:\/[\w-]+)?|tradiciones|autores(?:\/[\w-]+)?)?$/

export function getAuthDestination(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\s\\]/u.test(value)) return '/perfil'
  const pathname = value.split(/[?#]/u, 1)[0]
  return publicDestination.test(pathname) ? value : '/perfil'
}
