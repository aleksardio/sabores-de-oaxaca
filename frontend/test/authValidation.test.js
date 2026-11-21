import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateLogin, validateRecovery, validateRegistration } from '../src/utils/authValidation.js'

const fields = (values = {}) => new Map(Object.entries(values))
const email = 'persona@ejemplo.invalid'
const validRegistration = { displayName: 'Chanclas', email, password: 'x', confirmation: 'x' }

test('login requiere correo y contraseña', () => {
  assert.deepEqual(Object.keys(validateLogin(fields())), ['email', 'password'])
})

test('login y recuperación rechazan correos vacíos o mal formados', () => {
  for (const invalid of ['', '   ', 'persona', 'persona@', '@ejemplo.invalid', 'a@b@c.invalid']) {
    assert.ok(validateLogin(fields({ email: invalid, password: 'x' })).email)
    assert.ok(validateRecovery(fields({ email: invalid })).email)
  }
})

test('registro requiere los cuatro campos y rechaza un nombre de solo espacios', () => {
  assert.deepEqual(
    Object.keys(validateRegistration(fields({ displayName: '   ' }))),
    ['displayName', 'email', 'password', 'confirmation'],
  )
})

test('registro compara las contraseñas sin recortar espacios', () => {
  assert.match(validateRegistration(fields({ ...validRegistration, confirmation: 'x ' })).confirmation, /no coinciden/)
})

test('registro acepta un nombre de 100 caracteres y rechaza uno de 101', () => {
  const name = '🌽'.repeat(100)
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

test('los tres validadores aceptan datos con formato válido sin aplicar una política de composición', () => {
  assert.deepEqual(validateLogin(fields({ email, password: 'x' })), {})
  assert.deepEqual(validateRegistration(fields(validRegistration)), {})
  assert.deepEqual(validateRecovery(fields({ email: ` ${email} ` })), {})
})
