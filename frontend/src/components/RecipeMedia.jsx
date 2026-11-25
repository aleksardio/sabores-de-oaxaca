import { isHttpsMediaUrl } from '../utils/recipeEditorValidation.js'
import { canceledUpload } from '../utils/multimediaFiles.js'
import RecipeImage from './RecipeImage.jsx'
import RecipeVideo from './RecipeVideo.jsx'

const bytes = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 })

export default function RecipeMedia({ row, title, showImage = true }) {
  const { local, uploaded, url, alt, type } = row
  const remote = isHttpsMediaUrl(url)
  const src = local?.src ?? (remote ? url : null)
  const file = local ? { name: local.file.name, size: local.file.size } : uploaded
  const status = local ? {
    ready: 'Archivo seleccionado y listo para subir.',
    uploading: 'Subiendo archivo…',
    canceled: canceledUpload,
    error: local.error,
  }[local.status] : uploaded ? 'Archivo subido. Guarda la receta para asociarlo.' : 'Referencia guardada.'

  return (
    <div className="cook-media">
      {file && <p className="cook-muted">{file.name} · {bytes.format(file.size)} bytes</p>}
      <p className={local?.status === 'error' ? 'cook-error' : 'cook-muted'}
        role={local?.status === 'error' ? 'alert' : 'status'}>{status}</p>
      {type === 'IMAGEN' && showImage &&
        <RecipeImage key={src} image={src ? { src, alt } : null} title={title || 'la receta'} />}
      {type === 'VIDEO'
        ? <RecipeVideo url={url} localSrc={local?.src} label={alt || local?.file.name} />
        : remote && <a href={url} target="_blank" rel="noopener noreferrer">{alt || url} (abre en otra pestaña)</a>}
      {!local && !remote && <p>Referencia sin URL HTTPS válida.</p>}
    </div>
  )
}
