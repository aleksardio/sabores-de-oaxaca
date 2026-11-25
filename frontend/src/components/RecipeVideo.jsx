import { useState } from 'react'
import { isHttpsMediaUrl } from '../utils/recipeEditorValidation.js'
import { remoteVideoSource } from '../utils/recipeVideo.js'
import '../styles/recipe-video.css'

function VideoPlayer({ src, label }) {
  const [failed, setFailed] = useState(false)
  return failed
    ? <p role="status">No se pudo reproducir el video.</p>
    : <video src={src} controls playsInline preload="metadata" aria-label={label} onError={() => setFailed(true)} />
}

export default function RecipeVideo({ url, localSrc, label }) {
  const href = isHttpsMediaUrl(url) ? url : null
  const src = localSrc || remoteVideoSource(href)
  const name = label?.trim() || 'Ver video'
  if (!src && !href) return null
  return (
    <div className="recipe-video">
      {src && <VideoPlayer key={src} src={src} label={name} />}
      {href && <a href={href} target="_blank" rel="noopener noreferrer">{name} (abre en otra pestaña)</a>}
    </div>
  )
}
