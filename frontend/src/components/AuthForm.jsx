import { useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '../services/apiClient.js'

const fieldDetails = {
  displayName: { label: 'Nombre visible', type: 'text', autoComplete: 'nickname' },
  email: { label: 'Correo electrónico', type: 'email', autoComplete: 'email' },
  password: { label: 'Contraseña', type: 'password', autoComplete: 'new-password' },
  confirmation: { label: 'Confirmar contraseña', type: 'password', autoComplete: 'new-password' },
}

export default function AuthForm({ fields, validate, onSubmit, onSuccess, submitLabel, pendingLabel, showPasswordToggle = false, children }) {
  const id = useId()
  const formRef = useRef(null)
  const nextFieldToFocus = useRef(null)
  const [errors, setErrors] = useState({})
  const activeRequest = useRef(null)
  const validateOnChange = useRef(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => () => activeRequest.current?.abort(), [])

  useEffect(() => {
    const field = nextFieldToFocus.current
    if (field) {
      nextFieldToFocus.current = null
      formRef.current.elements.namedItem(field)?.focus()
    }
  }, [errors])

  async function handleSubmit(event) {
    event.preventDefault()
    if (activeRequest.current) return

    const form = event.currentTarget
    const values = new FormData(form)
    const nextErrors = validate(values)
    nextFieldToFocus.current = fields.find((field) => nextErrors[field])
    setErrors(nextErrors)
    setSubmitError('')
    validateOnChange.current = Boolean(nextFieldToFocus.current)

    if (nextFieldToFocus.current) return

    const controller = new AbortController()
    activeRequest.current = controller
    setPending(true)
    let succeeded = false
    try {
      await onSubmit(values, controller.signal)
      succeeded = true
    } catch (error) {
      if (controller.signal.aborted) return
      const fieldErrors = error instanceof ApiError ? error.fields : {}
      nextFieldToFocus.current = fields.find((field) => fieldErrors[field])
      setErrors(fieldErrors)
      setSubmitError(error instanceof ApiError ? error.message : 'No se pudo completar el envío.')
    } finally {
      if (!controller.signal.aborted) {
        for (const field of fields) {
          if (fieldDetails[field].type === 'password') form.elements.namedItem(field).value = ''
        }
        setPasswordVisible(false)
        activeRequest.current = null
        setPending(false)
      }
    }
    if (succeeded && !controller.signal.aborted) onSuccess?.()
  }

  function handleChange(event) {
    setSubmitError('')
    if (validateOnChange.current) {
      setErrors(validate(new FormData(event.currentTarget)))
    } else {
      const field = event.target.name
      setErrors((current) => ({ ...current, [field]: undefined }))
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
                  readOnly={pending}
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
                    disabled={pending}
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
        <button className="site-button site-button--clay" type="submit" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </button>
        {children}
      </div>
      <p className="auth-status" role="status">{pending ? pendingLabel : ''}</p>
      <p className="auth-status auth-status--error" role="alert">{submitError}</p>
    </form>
  )
}
