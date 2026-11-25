export const adminUserRoles = Object.freeze(['USUARIO', 'COCINERO', 'MODERADOR', 'ADMIN'])

export function canAdminister(user) {
  return user?.roles?.includes('ADMIN') ?? false
}

export function adminUserId(value) {
  const id = typeof value === 'string' && /^[1-9]\d*$/u.test(value) ? Number(value) : value
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
