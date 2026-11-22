import { useId, useRef, useState } from 'react'
import { moderationReasonLimit, prepareModerationDecision } from '../utils/moderationRules.js'

export default function ModerationDecisionForm({ kind, record, reviewerId, moderation, states }) {
  const [actionId, setActionId] = useState('')
  const [reason, setReason] = useState('')
  const [attempted, setAttempted] = useState(false)
  const id = useId()
  const actionField = useRef(null)
  const reasonField = useRef(null)
  const { actions, restriction } = moderation
  const selected = actions.find((action) => action.id === actionId)
  const { error, decision } = attempted
    ? prepareModerationDecision(kind, record, reviewerId, actionId, reason)
    : {}

  function checkDecision(event) {
    event.preventDefault()
    const result = prepareModerationDecision(kind, record, reviewerId, actionId, reason)
    setAttempted(true)
    if (result.error?.field === 'action') actionField.current?.focus()
    if (result.error?.field === 'reason') reasonField.current?.focus()
  }

  return (
    <section className="cook-panel mod-decision" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Preparar decisión {kind === 'recipe' ? 'editorial' : 'del reporte'}</h2>
      {restriction && <p className="mod-restriction">{restriction}</p>}
      {actions.length > 0 && (
        <form className="mod-form" onSubmit={checkDecision} noValidate>
          <div className="cook-field">
            <label htmlFor={`${id}-action`}>Acción</label>
            <select
              id={`${id}-action`}
              ref={actionField}
              required
              value={actionId}
              aria-invalid={error?.field === 'action' || undefined}
              aria-describedby={error?.field === 'action' ? `${id}-feedback` : undefined}
              onChange={(event) => {
                setActionId(event.target.value)
                setAttempted(false)
              }}
            >
              <option value="">Elige una acción</option>
              {actions.map(({ id: value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {selected && (
            <div className="cook-field">
              <label htmlFor={`${id}-reason`}>
                Justificación {selected.requiresReason ? '(obligatoria)' : '(opcional)'}
              </label>
              <textarea
                id={`${id}-reason`}
                ref={reasonField}
                rows={3}
                maxLength={moderationReasonLimit}
                required={selected.requiresReason}
                value={reason}
                aria-invalid={error?.field === 'reason' || undefined}
                aria-describedby={`${id}-limit${error?.field === 'reason' ? ` ${id}-feedback` : ''}`}
                onChange={(event) => {
                  setReason(event.target.value)
                  setAttempted(false)
                }}
              />
              <small id={`${id}-limit`}>Máximo: {moderationReasonLimit} caracteres.</small>
            </div>
          )}
          <div className="cook-actions">
            <button className="site-button cook-primary" type="submit">Comprobar requisitos</button>
            <button className="site-button" type="button" disabled aria-describedby={`${id}-integration`}>Confirmar decisión</button>
          </div>
          <p id={`${id}-integration`} className="cook-muted">La confirmación está deshabilitada hasta conectar el servidor. Nada se envía ni cambia de estado.</p>
          <p id={`${id}-feedback`} role="status" className={error ? 'cook-error' : 'cook-check-ok'}>
            {error?.message || (decision && 'Requisitos de demostración completos. Vista previa disponible.')}
          </p>
          {decision && (
            <div className="mod-decision-preview">
              <h3>Vista previa de la decisión</h3>
              <dl className="mod-facts">
                <div><dt>Identificador</dt><dd>{decision.resourceId}</dd></div>
                <div><dt>Acción</dt><dd>{decision.label}</dd></div>
                <div><dt>Estado actual</dt><dd>{states[decision.from]}</dd></div>
                <div><dt>Estado propuesto</dt><dd>{states[decision.to]}</dd></div>
                <div><dt>Justificación</dt><dd className="mod-justification">{decision.justification || 'Sin justificación.'}</dd></div>
              </dl>
            </div>
          )}
        </form>
      )}
      <p className="mod-audit cook-muted">Las decisiones quedarán registradas por el servidor cuando esté disponible la integración.</p>
    </section>
  )
}
