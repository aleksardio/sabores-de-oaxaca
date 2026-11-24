import { useEffect, useId, useRef } from 'react'
import { moderationReasonLimit } from '../utils/moderationRules.js'

export default function RecipeModerationForm({ review, state, ownRecipe }) {
  const id = useId()
  const reasonField = useRef(null)
  const confirmButton = useRef(null)
  const { recipe, reason, reasonError, confirmation, busy, blocked } = state
  const canDecide = Boolean(recipe && !ownRecipe && !blocked)
  const approving = confirmation === 'approve'

  useEffect(() => {
    if (reasonError) reasonField.current?.focus()
    if (confirmation) confirmButton.current?.focus()
  }, [reasonError, confirmation])

  return (
    <section className="cook-panel mod-decision" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Decisión editorial</h2>
      {ownRecipe && <p className="mod-restriction">No puedes aprobar ni rechazar tus propias recetas. Debe revisarla otra persona.</p>}
      {(canDecide || reason) && (
        <div className="mod-form">
          <div className="cook-field">
            <label htmlFor={`${id}-reason`}>Motivo (obligatorio para rechazar)</label>
            <textarea id={`${id}-reason`} ref={reasonField} rows={3} value={reason}
              readOnly={!canDecide || busy} onChange={(event) => review.setReason(event.target.value)}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={`${id}-limit${reasonError ? ` ${id}-error` : ''}`} />
            <small id={`${id}-limit`}>Máximo: {moderationReasonLimit} caracteres, sin contar espacios extremos.</small>
            {reasonError && <p id={`${id}-error`} className="cook-error" role="alert">{reasonError}</p>}
          </div>
          {canDecide && (
            <div className="cook-actions">
              <button className="site-button cook-primary" type="button" disabled={busy || Boolean(confirmation)}
                onClick={() => review.prepare('approve')}>Aprobar</button>
              <button className="site-button" type="button" disabled={busy || Boolean(confirmation)}
                onClick={() => review.prepare('reject')}>Rechazar</button>
            </div>
          )}
          {confirmation && (
            <div className="mod-decision-preview" role="group" aria-labelledby={`${id}-confirm`}>
              <h3 id={`${id}-confirm`}>{approving ? '¿Aprobar esta receta?' : '¿Rechazar esta receta?'}</h3>
              <p>{approving ? 'La receta podrá aparecer en el catálogo público.' : 'La receta saldrá de la cola de pendientes y no se publicará.'}</p>
              <div className="cook-actions mod-confirm-actions">
                <button ref={confirmButton} className="site-button cook-primary" type="button" onClick={review.confirm}>
                  {approving ? 'Confirmar aprobación' : 'Confirmar rechazo'}
                </button>
                <button className="site-button" type="button" onClick={review.dismiss}>Cancelar</button>
              </div>
            </div>
          )}
          {busy && <p role="status">Enviando decisión…</p>}
        </div>
      )}
      <p className="mod-audit cook-muted">El servidor registra las decisiones confirmadas en su auditoría.</p>
    </section>
  )
}
