import { Link } from 'react-router'
import { recipes } from '../data/recipes.js'
import { regions } from '../data/regions.js'
import '../styles/traditions.css'

const regionsWithRecipes = new Set(recipes.map(({ region }) => region))

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
        <div className="traditions-hero__art" aria-hidden="true">
          <span className="traditions-hero__plate" />
        </div>
      </section>

      <section className="traditions-regions" aria-labelledby="regiones">
        <p className="traditions-eyebrow">Cocinas de Oaxaca</p>
        <h2 id="regiones" tabIndex={-1}>Las ocho regiones de Oaxaca</h2>
        <p className="traditions-regions__intro">
          Explora la diversidad de estas cocinas y descubre qué platillos reúne el recetario de cada región.
        </p>
        <ul className="traditions-grid" role="list">
          {regions.map(({ name, motif, description }) => (
            <li className="traditions-card" key={name}>
              <div className={`traditions-card__art traditions-card__art--${motif}`} aria-hidden="true" />
              <div className="traditions-card__content">
                <h3>{name}</h3>
                <p>{description}</p>
                {!regionsWithRecipes.has(name) && (
                  <p className="traditions-card__note">Aún no hay recetas de esta región en el catálogo.</p>
                )}
                <Link
                  className="site-button"
                  to={{ pathname: '/recetas', search: new URLSearchParams({ region: name }).toString() }}
                  aria-label={`Ver recetas de ${name}`}
                >
                  Ver recetas <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
