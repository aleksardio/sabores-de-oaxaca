export default function RequestError({ error, onRetry, retryLabel = 'Reintentar' }) {
  return (
    <div className="public-request-error">
      <p role="alert">{error.message}</p>
      <button className="site-button" type="button" onClick={onRetry}>{retryLabel}</button>
    </div>
  )
}
