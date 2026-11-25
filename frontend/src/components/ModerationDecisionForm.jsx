import { useEffect, useId, useRef } from 'react'
import { reportDecisions } from '../utils/reportRules.js'

export default function ModerationDecisionForm({ review, confirmation, busy }) {
  const id = useId()
  const confirmButton = useRef(null)
  const actionButtons = useRef({})
  const selected = reportDecisions[confirmation]

  useEffect(() => {
    if (confirmation) confirmButton.current?.focus()
  }, [confirmation])

  return (
    <section className="cook-panel mod-decision" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>Decisión del reporte</h2>
      <div className="mod-form">
        <div className="cook-actions">
          {Object.entries(reportDecisions).map(([action, { label }]) => (
            <button key={action} ref={(button) => { actionButtons.current[action] = button }}
              className="site-button" type="button" disabled={busy || Boolean(confirmation)}
              onClick={() => review.prepare(action)}>{label}</button>
          ))}
        </div>
        {selected && (
          <div className="mod-decision-preview" role="group" aria-labelledby={`${id}-confirm`}>
            <h3 id={`${id}-confirm`}>¿Confirmar: {selected.label}?</h3>
            <p>{selected.consequence}</p>
            <div className="cook-actions mod-confirm-actions">
              <button ref={confirmButton} className="site-button cook-primary" type="button" onClick={review.confirm}>
                {confirmation === 'descartar' ? 'Confirmar descarte' : 'Confirmar baja'}
              </button>
              <button className="site-button" type="button" onClick={() => {
                review.dismiss()
                requestAnimationFrame(() => actionButtons.current[confirmation]?.focus())
              }}>Cancelar</button>
            </div>
          </div>
        )}
        {busy && <p role="status">Procesando decisión…</p>}
      </div>
      <p className="mod-audit cook-muted">El servidor registra las decisiones en su auditoría.</p>
    </section>
  )
}
