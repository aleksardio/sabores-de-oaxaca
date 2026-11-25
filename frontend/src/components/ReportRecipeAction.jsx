import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useReports } from '../hooks/useReports.js'
import { isUncertainReportWrite, ownReportRecipe } from '../services/reportsService.js'
import { getAuthDestination } from '../utils/authDestination.js'
import { isOwnReportRecipe, reportReasonLimit, validateReportReason } from '../utils/reportRules.js'

function ReportForm({ recipe, service }) {
  const id = useId()
  const openingButton = useRef(null)
  const field = useRef(null)
  const confirmation = useRef(null)
  const activeWrite = useRef(false)
  const [stage, setStage] = useState('closed')
  const [reason, setReason] = useState('')
  const [validated, setValidated] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)
  const problem = validated ? validateReportReason(reason) : ''

  useEffect(() => {
    if (stage === 'edit') field.current?.focus()
    if (stage === 'confirm') confirmation.current?.focus()
  }, [stage])

  function close() {
    setStage('closed')
    setReason('')
    setValidated(false)
    setFeedback('')
    openingButton.current?.focus()
  }

  function prepare(event) {
    event.preventDefault()
    if (stage !== 'edit' || activeWrite.current) return
    setValidated(true)
    setFeedback('')
    if (validateReportReason(reason)) field.current?.focus()
    else setStage('confirm')
  }

  async function send() {
    if (stage !== 'confirm' || activeWrite.current) return
    activeWrite.current = true
    setStage('sending')
    try {
      await service.create(recipe, reason)
      close()
      setSent(true)
    } catch (error) {
      if (error.name === 'AbortError') return
      setFeedback(isUncertainReportWrite(error)
        ? 'No se pudo confirmar el envío. El servidor podría haber recibido el reporte; no se reenviará automáticamente.'
        : error.message)
      setStage('edit')
    } finally {
      activeWrite.current = false
    }
  }

  return (
    <div className="recipe-report">
      <button ref={openingButton} className="site-button" type="button" aria-expanded={stage !== 'closed'}
        onClick={() => { if (stage === 'closed') { setSent(false); setStage('edit') } }}>Reportar receta</button>
      {sent && <p role="status">Reporte enviado correctamente.</p>}
      {stage !== 'closed' && (
        <form className="mod-form" onSubmit={prepare} noValidate>
          <div className="cook-field">
            <label htmlFor={`${id}-reason`}>Motivo del reporte (obligatorio)</label>
            <textarea ref={field} id={`${id}-reason`} rows={4} value={reason} required maxLength={reportReasonLimit}
              readOnly={stage !== 'edit'} aria-invalid={Boolean(problem) || undefined}
              aria-describedby={`${id}-count${problem ? ` ${id}-error` : ''}`}
              onChange={(event) => setReason(event.target.value)} />
            <small id={`${id}-count`}>{reason.length} de {reportReasonLimit} caracteres</small>
            {problem && <p id={`${id}-error`} className="cook-error" role="alert">{problem}</p>}
          </div>
          {feedback && <p role="alert" className="cook-error">{feedback}</p>}
          {stage === 'edit' && <div className="cook-actions">
            <button className="site-button cook-primary" type="submit">Revisar envío</button>
            <button className="site-button" type="button" onClick={close}>Cancelar reporte</button>
          </div>}
          {stage === 'confirm' && <div className="mod-decision-preview" role="group" aria-labelledby={`${id}-confirm`}>
            <h3 id={`${id}-confirm`}>¿Enviar este reporte a moderación?</h3>
            <div className="cook-actions mod-confirm-actions">
              <button ref={confirmation} className="site-button cook-primary" type="button" onClick={send}>Confirmar envío</button>
              <button className="site-button" type="button" onClick={() => setStage('edit')}>Volver a editar</button>
              <button className="site-button" type="button" onClick={close}>Cancelar reporte</button>
            </div>
          </div>}
          {stage === 'sending' && <p role="status">Enviando reporte…</p>}
        </form>
      )}
    </div>
  )
}

export default function ReportRecipeAction({ recipe }) {
  const { user, service } = useReports()
  const { pathname, search, hash } = useLocation()
  if (!user) return <Link className="site-button" to="/login"
    state={{ from: getAuthDestination(pathname + search + hash) }}>Reportar receta</Link>
  if (isOwnReportRecipe(user, recipe)) return <p className="detail-meta">{ownReportRecipe}</p>
  return <ReportForm key={`${user.id}:${recipe.id}`} recipe={recipe} service={service} />
}
