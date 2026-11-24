export default function RecipePreparation({ preparation, titleId = 'detail-preparation-title' }) {
  const steps = (preparation ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  return (
    <section className="detail-panel detail-preparation" aria-labelledby={titleId}>
      <h2 id={titleId}>Preparación paso a paso</h2>
      {steps.length > 0 ? (
        <ol className="detail-steps" role="list">
          {steps.map((step, index) => (
            <li key={index}>
              <span className="detail-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : <p>Aún no hay instrucciones.</p>}
    </section>
  )
}
