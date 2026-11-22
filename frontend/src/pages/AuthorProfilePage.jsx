import { Link, useParams } from 'react-router'
import { findDemoAuthor } from '../data/demoAuthors.js'
import '../styles/community.css'

export default function AuthorProfilePage() {
  const { id } = useParams()
  const author = findDemoAuthor(id)

  if (!author) {
    return (
      <section className="community-page" aria-labelledby="author-title">
        <div className="community-panel community-panel--hero">
          <h1 id="author-title">Autor no encontrado</h1>
          <p>No hay un perfil de demostración con ese identificador.</p>
          <Link className="site-button" to="/autores">Volver a autores</Link>
        </div>
      </section>
    )
  }

  return (
    <article className="community-page" aria-labelledby="author-title">
      <header className="community-panel community-panel--hero">
        <Link className="community-back" to="/autores"><span aria-hidden="true">← </span>Volver a autores</Link>
        <div className="community-identity">
          <span className="community-avatar" aria-hidden="true">{author.initials}</span>
          <div>
            <p className="community-eyebrow">Perfil ficticio de demostración</p>
            <h1 id="author-title">{author.nombre_visible}</h1>
          </div>
        </div>
        {author.biografia && <p>{author.biografia}</p>}
      </header>

      <section className="community-panel" aria-labelledby="author-recipes-title">
        <h2 id="author-recipes-title">Recetas del autor</h2>
        <p>Las recetas asociadas al autor aparecerán aquí cuando se conecte la API. Las recetas del catálogo de demostración no tienen autor asignado.</p>
        <Link className="site-button site-button--green" to="/recetas">Explorar el catálogo</Link>
      </section>
    </article>
  )
}
