import { creditSegments, parsePhotoCredit } from '../utils/recipeDescription.js'

export default function PhotoCredits({ credits }) {
  return (
    <figcaption className="detail-photo-credits">
      <strong>{credits.length === 1 ? 'Crédito de la imagen' : 'Créditos de las imágenes'}</strong>
      <ul>
        {credits.map((credit, index) => {
          const entry = parsePhotoCredit(credit)
          return (
            <li key={`${index}-${credit}`}>
              {entry ? <>
                <cite>{entry.title}</cite> · {entry.author} · {entry.collection}
                {entry.changes && <> · {entry.changes}</>}
                <span className="detail-photo-credits__links">
                  <a href={entry.source}>Fuente de la imagen</a>
                  <a href={entry.terms}>Licencia {entry.license}</a>
                </span>
              </> : creditSegments(credit).map(({ href, text }, i) => href
                ? <a key={i} href={href}>{text}</a> : text)}
            </li>
          )
        })}
      </ul>
    </figcaption>
  )
}
