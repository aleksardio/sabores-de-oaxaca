const publicDestination = /^\/(?:perfil|favoritos|recetas(?:\/[\w-]+)?|tradiciones|autores(?:\/[\w-]+)?)?$/
const cookDestination = /^\/cocinero(?:\/recetas(?:\/(?:nueva|[1-9]\d*\/(?:editar|vista-previa)))?)?\/?$/

export function getAuthDestination(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\s\\]/u.test(value)) return '/perfil'
  const pathname = value.split(/[?#]/u, 1)[0]
  return publicDestination.test(pathname) || cookDestination.test(pathname) ? value : '/perfil'
}
