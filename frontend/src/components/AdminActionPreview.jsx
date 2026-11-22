import { useId, useRef, useState } from 'react'
import {
  adminAccountStates, adminActionLabels, adminDeletionStates, adminDetailLimit, adminEditorialStates,
  adminRoles, getAdminActionNote, getAdminActions, isRoleAction, prepareAdminAction,
} from '../utils/adminRules.js'

function ExpectedChange({ record, changes }) {
  if (changes.roles) {
    return <div><dt>Roles actuales → esperados</dt><dd>{record.roles.join(', ') || 'Sin roles'} → {changes.roles.join(', ') || 'Sin roles'}</dd></div>
  }
  if ('active' in changes) {
    const status = (active) => adminAccountStates[active ? 'active' : 'inactive']
    return <div><dt>Estado de cuenta: actual → esperado</dt><dd>{status(record.active)} → {status(changes.active)}</dd></div>
  }
  const deletion = (deleted) => adminDeletionStates[deleted ? 'inactive' : 'active']
  return (
    <>
      <div><dt>Baja lógica: actual → esperada</dt><dd>{deletion(record.deletedOn !== null)} → {deletion(changes.deleted)}</dd></div>
      <div><dt>Estado editorial: actual → esperado</dt><dd>{adminEditorialStates[record.state]} → {adminEditorialStates[changes.state]}</dd></div>
    </>
  )
}

export default function AdminActionPreview({ kind, record, onCancel, headingRef }) {
  const id = useId()
  const formRef = useRef(null)
  const actions = getAdminActions(kind, record)
  const [action, setAction] = useState(actions.length === 1 ? actions[0] : '')
  const [role, setRole] = useState('')
  const [detail, setDetail] = useState('')
  const [result, setResult] = useState({})
  const { error, preview } = result
  const note = getAdminActionNote(action, record)
  const name = record.name ?? record.title

  function handleSubmit(event) {
    event.preventDefault()
    const next = prepareAdminAction(kind, record, { action, role, detail })
    setResult(next)
    if (next.error) formRef.current.elements.namedItem(next.error.field)?.focus()
  }

  function validation(field) {
    return error?.field === field ? {
      'aria-invalid': true,
      'aria-describedby': `${id}-feedback`,
    } : {}
  }

  return (
    <section className="cook-panel admin-action" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
        {kind === 'user' ? 'Preparar acciones administrativas' : 'Preparar baja o restauración'}
      </h2>
      <p className="cook-muted">Recurso de ejemplo: <strong>{name}</strong> ({record.id}).</p>
      <form className="admin-form" ref={formRef} onSubmit={handleSubmit} noValidate>
        {actions.length === 1 ? (
          <p><strong>Acción:</strong> {adminActionLabels[action]} ({action})</p>
        ) : (
          <label className="cook-field">
            Acción
            <select name="action" value={action} required {...validation('action')} onChange={(event) => {
              setAction(event.target.value)
              setRole('')
              setResult({})
            }}>
              <option value="">Elige una acción</option>
              {actions.map((value) => <option key={value} value={value}>{adminActionLabels[value]}</option>)}
            </select>
          </label>
        )}
        {isRoleAction(action) && (
          <label className="cook-field">
            Rol
            <select name="role" value={role} required {...validation('role')} onChange={(event) => {
              setRole(event.target.value)
              setResult({})
            }}>
              <option value="">Elige un rol</option>
              {adminRoles.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        )}
        {kind === 'recipe' && (
          <p className="cook-muted">Estado actual: {adminEditorialStates[record.state]} · {adminDeletionStates[record.deletedOn === null ? 'active' : 'inactive']}.</p>
        )}
        {note && <p className="admin-note">{note}</p>}
        <div className="cook-field">
          <label htmlFor={`${id}-detail`}>Justificación (obligatoria)</label>
          <textarea
            id={`${id}-detail`} name="detail" rows={3} maxLength={adminDetailLimit} required value={detail}
            {...validation('detail')}
            aria-describedby={`${id}-limit${error?.field === 'detail' ? ` ${id}-feedback` : ''}`}
            onChange={(event) => {
              setDetail(event.target.value)
              setResult({})
            }}
          />
          <small id={`${id}-limit`}>Máximo: {adminDetailLimit} caracteres. No incluyas datos sensibles.</small>
        </div>
        <div className="cook-actions">
          <button className="site-button cook-primary" type="submit">Previsualizar operación</button>
          <button className="site-button" type="button" disabled aria-describedby={`${id}-integration`}>Confirmar operación</button>
          {onCancel && <button className="site-button" type="button" onClick={onCancel}>Cerrar preparación</button>}
        </div>
        <p className="cook-muted" id={`${id}-integration`}>Confirmación deshabilitada hasta la integración con el servidor. No se guardan cambios ni se registra auditoría.</p>
        <p className={error ? 'cook-error' : 'cook-check-ok'} role="status" id={`${id}-feedback`}>
          {error?.message ?? (preview ? 'Vista previa disponible. No se ejecutó la operación.' : '')}
        </p>
        {preview && (
          <div className="admin-preview">
            <h3>Vista previa de la operación</h3>
            <dl className="admin-facts">
              <div><dt>Recurso</dt><dd>{name} ({preview.resourceId})</dd></div>
              <div><dt>Acción</dt><dd>{adminActionLabels[preview.action]} ({preview.action})</dd></div>
              <ExpectedChange record={record} changes={preview.changes} />
              <div><dt>Justificación</dt><dd className="admin-justification">{preview.detail}</dd></div>
            </dl>
          </div>
        )}
      </form>
    </section>
  )
}
