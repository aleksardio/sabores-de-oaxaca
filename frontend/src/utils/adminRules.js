import { normalizeRecipeText } from './recipeEditorValidation.js'

export const adminRoles = Object.freeze(['USUARIO', 'COCINERO', 'MODERADOR', 'ADMIN'])
export const adminDetailLimit = 1000

export const adminAccountStates = { active: 'Activa', inactive: 'Desactivada' }
export const adminDeletionStates = { active: 'Sin baja', inactive: 'De baja lógica' }
export const adminEditorialStates = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  PUBLICADA: 'Publicada',
  RECHAZADA: 'Rechazada',
  ARCHIVADA: 'Archivada',
}

export const adminActionLabels = {
  ASIGNAR_ROL: 'Asignar rol',
  RETIRAR_ROL: 'Retirar rol',
  DESACTIVAR_CUENTA: 'Desactivar cuenta',
  REACTIVAR_CUENTA: 'Reactivar cuenta',
  BAJA_RECETA: 'Dar de baja la receta',
  RESTAURAR_RECETA: 'Restaurar la receta',
}

export function findAdminRecord(records, id) {
  return records.find((record) => record.id === id)
}

export function matchesAdminSearch(text, search) {
  return normalizeRecipeText(text).includes(normalizeRecipeText(search))
}

function matchesStatus(active, status) {
  return !status || status === (active ? 'active' : 'inactive')
}

export function filterAdminUsers(users, { search = '', status = '', role = '' } = {}) {
  return users.filter((user) => (
    matchesAdminSearch(user.name, search) &&
    matchesStatus(user.active, status) &&
    (!role || user.roles.includes(role))
  ))
}

export function filterAdminRecipes(recipes, { search = '', state = '', status = '' } = {}) {
  return recipes.filter((recipe) => (
    (matchesAdminSearch(recipe.title, search) || matchesAdminSearch(recipe.author, search)) &&
    (!state || recipe.state === state) &&
    matchesStatus(recipe.deletedOn === null, status)
  ))
}

export function getAdminActions(kind, record) {
  if (!record) return []
  if (kind === 'user') {
    return [
      'ASIGNAR_ROL', 'RETIRAR_ROL',
      record.active ? 'DESACTIVAR_CUENTA' : 'REACTIVAR_CUENTA',
    ]
  }
  if (kind === 'recipe') return [record.deletedOn === null ? 'BAJA_RECETA' : 'RESTAURAR_RECETA']
  return []
}

export function isRoleAction(action) {
  return action === 'ASIGNAR_ROL' || action === 'RETIRAR_ROL'
}

export function getAdminActionNote(action, record) {
  switch (action) {
    case 'DESACTIVAR_CUENTA':
      return 'La baja sería lógica: no se eliminaría la cuenta. El servidor impediría el acceso y las operaciones, e invalidaría las sesiones y las recuperaciones pendientes.'
    case 'REACTIVAR_CUENTA':
      return 'El servidor quitaría la baja lógica sin recuperar las sesiones anteriores.'
    case 'BAJA_RECETA':
      return 'Se marcaría la baja lógica sin cambiar el estado editorial. Se conservarían las asociaciones, los reportes y la auditoría.'
    case 'RESTAURAR_RECETA':
      return record.state === 'PUBLICADA'
        ? 'Pasaría a PENDIENTE, seguiría oculta y necesitaría una nueva aprobación. Restaurar no equivale a aprobar ni publicar.'
        : 'Se conservaría el estado editorial. Una receta ARCHIVADA no se desarchiva automáticamente. Restaurar no equivale a aprobar ni publicar.'
    default:
      return null
  }
}

const invalid = (field, message) => ({ error: { field, message } })

export function prepareAdminAction(kind, record, { action, role, detail }) {
  if (!record) return invalid('action', 'El recurso de ejemplo no existe.')
  if (!action) return invalid('action', 'Elige una acción.')
  if (!getAdminActions(kind, record).includes(action)) {
    return invalid('action', 'La acción no corresponde al recurso o a su estado actual.')
  }

  let changes
  if (isRoleAction(action)) {
    if (!adminRoles.includes(role)) return invalid('role', 'Elige uno de los cuatro roles permitidos.')
    const assigning = action === 'ASIGNAR_ROL'
    if (record.roles.includes(role) === assigning) {
      return invalid('role', assigning ? 'La cuenta ya tiene este rol.' : 'La cuenta no tiene este rol.')
    }
    changes = {
      roles: assigning ? [...record.roles, role] : record.roles.filter((current) => current !== role),
    }
  } else if (kind === 'user') {
    changes = { active: action === 'REACTIVAR_CUENTA' }
  } else {
    const restoring = action === 'RESTAURAR_RECETA'
    changes = {
      deleted: !restoring,
      state: restoring && record.state === 'PUBLICADA' ? 'PENDIENTE' : record.state,
    }
  }

  const justification = detail?.trim()
  if (!justification) return invalid('detail', 'Escribe una justificación para preparar la acción.')
  if ([...justification].length > adminDetailLimit) {
    return invalid('detail', `La justificación no puede superar ${adminDetailLimit} caracteres.`)
  }

  return { preview: { resourceId: record.id, action, detail: justification, changes } }
}
