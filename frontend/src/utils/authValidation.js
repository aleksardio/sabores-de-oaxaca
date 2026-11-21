// Sintaxis de type="email" para una sola dirección, sin comprobar su existencia.
const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i

function addEmailError(errors, values) {
  const email = String(values.get('email') ?? '').trim()
  if (!email) {
    errors.email = 'Escribe tu correo electrónico.'
  } else if (email.length > 254) {
    errors.email = 'El correo electrónico debe tener como máximo 254 caracteres.'
  } else if (!emailPattern.test(email)) {
    errors.email = 'Escribe un correo electrónico válido, por ejemplo, nombre@correo.com.'
  }
}

function addPasswordError(errors, values) {
  if (!values.get('password')) {
    errors.password = 'Escribe tu contraseña.'
  }
}

export function validateLogin(values) {
  const errors = {}
  addEmailError(errors, values)
  addPasswordError(errors, values)
  return errors
}

export function validateRegistration(values) {
  const errors = {}
  const name = String(values.get('displayName') ?? '').trim()
  if (!name) {
    errors.displayName = 'Escribe tu nombre visible.'
  } else if (Array.from(name).length > 100) {
    errors.displayName = 'El nombre visible debe tener como máximo 100 caracteres.'
  }

  addEmailError(errors, values)
  addPasswordError(errors, values)

  const confirmation = values.get('confirmation')
  if (!confirmation) {
    errors.confirmation = 'Confirma tu contraseña.'
  } else if (values.get('password') && confirmation !== values.get('password')) {
    errors.confirmation = 'Las contraseñas no coinciden.'
  }

  return errors
}

export function validateRecovery(values) {
  const errors = {}
  addEmailError(errors, values)
  return errors
}
