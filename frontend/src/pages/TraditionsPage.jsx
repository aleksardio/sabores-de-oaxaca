import { Link } from 'react-router'
import { marketPhoto, regions } from '../data/regions.js'
import '../styles/traditions.css'

function PhotoAttribution({ photo }) {
  return (
    <small className="traditions-photo-credit">
      Foto: {photo.author} · <a href={photo.source} aria-label={`Fuente de la fotografía: ${photo.place}`}>Commons</a>
      {' · '}<a href={photo.terms}>{photo.license}</a> · Adaptada a WebP
    </small>
  )
}

export default function TraditionsPage() {
  return (
    <div className="traditions">
      <section className="traditions-hero" aria-labelledby="traditions-title">
        <div className="traditions-hero__content">
          <p className="traditions-eyebrow">Tradiciones de Oaxaca</p>
          <h1 id="traditions-title">Oaxaca se comparte en la mesa</h1>
          <p className="traditions-hero__intro">
            Cocinar y compartir lo que se prepara reúne a las personas. En las cocinas,
            los mercados y las fiestas de Oaxaca, cada familia y comunidad aporta su
            manera de preparar y transmitir lo que sabe.
          </p>
          <div className="traditions-hero__actions">
            <Link className="site-button site-button--green" to="#regiones">Explorar las regiones</Link>
            <Link className="site-button" to="/recetas">Ver catálogo de recetas</Link>
          </div>
        </div>
        <figure className="traditions-hero__photo">
          <img src={marketPhoto.src} alt={marketPhoto.alt} />
          <figcaption>
            <strong>{marketPhoto.place}</strong>
            <PhotoAttribution photo={marketPhoto} />
          </figcaption>
        </figure>
      </section>

      <section className="traditions-regions" aria-labelledby="regiones">
        <p className="traditions-eyebrow">Cocinas de Oaxaca</p>
        <h2 id="regiones" tabIndex={-1}>Las ocho regiones de Oaxaca</h2>
        <p className="traditions-regions__intro">
          Conoce la diversidad de estas cocinas. Esta guía cultural es independiente del catálogo,
          que por ahora no se puede filtrar por región.
        </p>
        <ul className="traditions-grid" role="list">
          {regions.map(({ name, photo, description }) => (
            <li className="traditions-card" key={name}>
              <img className="traditions-card__image" src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
              <div className="traditions-card__content">
                <h3>{name}</h3>
                <p className="traditions-card__place">{photo.place}</p>
                <p>{description}</p>
                <PhotoAttribution photo={photo} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
