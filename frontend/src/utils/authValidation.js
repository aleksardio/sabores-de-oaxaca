// Validación de formato para una sola dirección, sin comprobar su existencia.
const emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
const encoder = new TextEncoder()

function addEmailError(errors, values) {
  const email = String(values.get('email') ?? '').trim()
  if (!email) {
    errors.email = 'Escribe tu correo electrónico.'
  } else if (email.length > 254) {
    errors.email = 'El correo electrónico debe tener como máximo 254 caracteres.'
  } else if (!emailPattern.test(email) || email.split('@')[0].length > 64) {
    errors.email = 'Escribe un correo electrónico válido, por ejemplo, nombre@correo.com.'
  }
}

function addPasswordError(errors, values, registration = false) {
  const password = String(values.get('password') ?? '')
  if (!password.trim()) {
    errors.password = 'Escribe tu contraseña.'
  } else if (password.length > 72 || (registration && password.length < 8)) {
    errors.password = registration
      ? 'La contraseña debe tener entre 8 y 72 caracteres.'
      : 'La contraseña debe tener como máximo 72 caracteres.'
  } else if (encoder.encode(password).length > 72) {
    errors.password = 'La contraseña no puede superar 72 bytes en UTF-8.'
  } else if (registration && (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^\p{L}\p{N}\s]/u.test(password))) {
    errors.password = 'Incluye una mayúscula de A a Z, un número y un carácter especial.'
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
  } else if (name.length > 100) {
    errors.displayName = 'El nombre visible debe tener como máximo 100 caracteres.'
  }

  addEmailError(errors, values)
  addPasswordError(errors, values, true)

  const confirmation = values.get('confirmation')
  if (!confirmation) {
    errors.confirmation = 'Confirma tu contraseña.'
  } else if (values.get('password') && confirmation !== values.get('password')) {
    errors.confirmation = 'Las contraseñas no coinciden.'
  }

  return errors
}
