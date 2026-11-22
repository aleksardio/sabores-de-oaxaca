import { Link } from 'react-router'
import { demoAuthors } from '../data/demoAuthors.js'
import '../styles/community.css'

export default function AuthorsPage() {
  return (
    <section className="community-page" aria-labelledby="authors-title">
      <header className="community-panel community-panel--hero">
        <p className="community-eyebrow">Comunidad</p>
        <h1 id="authors-title">Autores</h1>
        <p>Estos perfiles ficticios muestran cómo se presentarán los autores cuando se conecte la API.</p>
      </header>

      <ul className="community-author-grid" role="list">
        {demoAuthors.map((author) => (
          <li className="community-panel community-author-card" key={author.id}>
            <div className="community-identity">
              <span className="community-avatar" aria-hidden="true">{author.initials}</span>
              <div>
                <p className="community-eyebrow">Perfil de ejemplo</p>
                <h2>{author.nombre_visible}</h2>
              </div>
            </div>
            {author.biografia && <p>{author.biografia}</p>}
            <Link className="site-button" to={`/autores/${author.id}`} aria-label={`Ver perfil de ${author.nombre_visible}`}>
              Ver perfil <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
