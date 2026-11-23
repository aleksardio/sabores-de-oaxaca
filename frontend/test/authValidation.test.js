import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateLogin, validateRegistration } from '../src/utils/authValidation.js'

const fields = (values = {}) => new Map(Object.entries(values))
const email = 'persona@ejemplo.invalid'
const validRegistration = { displayName: 'Chanclas', email, password: 'Ejemplo1!', confirmation: 'Ejemplo1!' }

test('login requiere correo y contraseña', () => {
  assert.deepEqual(Object.keys(validateLogin(fields())), ['email', 'password'])
})

test('login rechaza correos vacíos o mal formados', () => {
  for (const invalid of ['', '   ', 'persona', 'persona@', '@ejemplo.invalid', 'a@b@c.invalid', 'a..b@ejemplo.invalid']) {
    assert.ok(validateLogin(fields({ email: invalid, password: 'x' })).email)
  }
})

test('registro requiere los cuatro campos y rechaza un nombre de solo espacios', () => {
  assert.deepEqual(
    Object.keys(validateRegistration(fields({ displayName: '   ' }))),
    ['displayName', 'email', 'password', 'confirmation'],
  )
})

test('registro compara las contraseñas sin recortar espacios', () => {
  const password = ` ${validRegistration.password} `
  assert.deepEqual(validateRegistration(fields({ ...validRegistration, password, confirmation: password })), {})
  assert.match(validateRegistration(fields({ ...validRegistration, password })).confirmation, /no coinciden/)
})

test('registro acepta un nombre de 100 caracteres y rechaza uno de 101', () => {
  const name = '🌽'.repeat(50) // @Size en Java cuenta unidades UTF-16.
  assert.deepEqual(validateRegistration(fields({ ...validRegistration, displayName: name })), {})
  assert.match(validateRegistration(fields({ ...validRegistration, displayName: `${name}a` })).displayName, /100/)
})

test('el correo admite hasta 254 caracteres', () => {
  const domain = [...Array(3).fill('b'.repeat(62)), 'c'.repeat(63)].join('.')
  const maxEmail = `a@${domain}`
  assert.equal(maxEmail.length, 254)
  assert.deepEqual(validateRegistration(fields({ ...validRegistration, email: maxEmail })), {})
  assert.match(validateRegistration(fields({ ...validRegistration, email: `a${maxEmail}` })).email, /254/)
})

test('login no exige la política de composición de registro', () => {
  assert.deepEqual(validateLogin(fields({ email, password: 'x' })), {})
})

test('registro exige longitud, mayúscula ASCII, dígito y carácter especial que no sea espacio ni letra', () => {
  for (const password of ['Ab1!', 'ejemplo1!', 'Éjemplo1!', 'Ejemplo!', 'Ejemplo1 ', 'Ejemplo1é', `A1!${'b'.repeat(70)}`]) {
    assert.ok(validateRegistration(fields({ ...validRegistration, password, confirmation: password })).password)
  }
  assert.deepEqual(validateRegistration(fields(validRegistration)), {})
})

test('registro y login rechazan más de 72 bytes, no solo más de 72 caracteres', () => {
  const password = `A1!x${'é'.repeat(34)}`
  const valid = { ...validRegistration, password, confirmation: password }
  assert.deepEqual(validateRegistration(fields(valid)), {})
  assert.match(validateRegistration(fields({ ...valid, password: `${password}x` })).password, /72 bytes/)
  assert.match(validateLogin(fields({ ...valid, password: `${password}x` })).password, /72 bytes/)
})
