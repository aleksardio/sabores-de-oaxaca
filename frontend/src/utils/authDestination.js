const publicDestination = /^\/(?:perfil|favoritos|recetas(?:\/[\w-]+)?|tradiciones|autores(?:\/[\w-]+)?)?$/
const cookDestination = /^\/cocinero(?:\/recetas(?:\/(?:nueva|[1-9]\d*\/(?:editar|vista-previa)))?)?\/?$/
const moderationDestination = /^\/moderador(?:\/(?:recetas|reportes)(?:\/[1-9]\d*)?)?\/?$/
const adminDestination = /^\/admin(?:\/(?:usuarios(?:\/[1-9]\d*)?|catalogos|recetas))?\/?$/

export function getAuthDestination(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\s\\]/u.test(value)) return '/perfil'
  const pathname = value.split(/[?#]/u, 1)[0]
  return [publicDestination, cookDestination, moderationDestination, adminDestination].some((allowed) => allowed.test(pathname)) ? value : '/perfil'
}
