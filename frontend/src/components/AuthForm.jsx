import { useEffect, useId, useRef, useState } from 'react'

const fieldDetails = {
  displayName: { label: 'Nombre visible', type: 'text', autoComplete: 'nickname' },
  email: { label: 'Correo electrónico', type: 'email', autoComplete: 'email' },
  password: { label: 'Contraseña', type: 'password', autoComplete: 'new-password' },
  confirmation: { label: 'Confirmar contraseña', type: 'password', autoComplete: 'new-password' },
}

export default function AuthForm({ fields, validate, submitLabel, showPasswordToggle = false, children }) {
  const id = useId()
  const formRef = useRef(null)
  const nextFieldToFocus = useRef(null)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const field = nextFieldToFocus.current
    if (field) {
      nextFieldToFocus.current = null
      formRef.current.elements.namedItem(field)?.focus()
    }
  }, [errors])

  function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const nextErrors = validate(new FormData(form))
    nextFieldToFocus.current = fields.find((field) => nextErrors[field])
    setErrors(nextErrors)
    setSubmitted(Boolean(nextFieldToFocus.current))

    if (nextFieldToFocus.current) {
      setStatus('')
      return
    }

    for (const field of fields) {
      if (fieldDetails[field].type === 'password') {
        form.elements.namedItem(field).value = ''
      }
    }
    setPasswordVisible(false)
    setStatus('Formulario validado. Esta función estará disponible cuando conectemos el servidor.')
  }

  function handleChange(event) {
    setStatus('')
    if (submitted) {
      setErrors(validate(new FormData(event.currentTarget)))
    }
  }

  return (
    <form className="auth-form" ref={formRef} noValidate onSubmit={handleSubmit} onChange={handleChange}>
      <div className="auth-fields">
        {fields.map((field) => {
          const { label, type, autoComplete } = fieldDetails[field]
          const fieldId = `${id}-${field}`
          const errorId = `${fieldId}-error`
          const canToggle = field === 'password' && showPasswordToggle

          return (
            <div className="auth-field" key={field}>
              <label htmlFor={fieldId}>{label}</label>
              <div className={`auth-input-wrap${canToggle ? ' auth-input-wrap--toggle' : ''}`}>
                <input
                  id={fieldId}
                  name={field}
                  type={canToggle && passwordVisible ? 'text' : type}
                  autoComplete={canToggle ? 'current-password' : autoComplete}
                  autoCapitalize={field === 'email' || type === 'password' ? 'none' : undefined}
                  spellCheck={field === 'email' || type === 'password' ? false : undefined}
                  required
                  aria-invalid={errors[field] ? true : undefined}
                  aria-describedby={errors[field] ? errorId : undefined}
                />
                {canToggle && (
                  <button
                    className="auth-password-toggle"
                    type="button"
                    aria-controls={fieldId}
                    aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setPasswordVisible((visible) => !visible)}
                  >
                    {passwordVisible ? 'Ocultar' : 'Mostrar'}
                  </button>
                )}
              </div>
              {errors[field] && <p className="auth-field-error" id={errorId}>{errors[field]}</p>}
            </div>
          )
        })}
      </div>
      <div className="auth-actions">
        <button className="site-button site-button--clay" type="submit">{submitLabel}</button>
        {children}
      </div>
      <p className="auth-status" role="status" aria-atomic="true">{status}</p>
    </form>
  )
}
