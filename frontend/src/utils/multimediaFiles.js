const formats = {
  jpg: ['image/jpeg', 'IMAGEN'],
  jpeg: ['image/jpeg', 'IMAGEN'],
  png: ['image/png', 'IMAGEN'],
  webp: ['image/webp', 'IMAGEN'],
  mp4: ['video/mp4', 'VIDEO'],
  webm: ['video/webm', 'VIDEO'],
}

const limitsMiB = { IMAGEN: 5, VIDEO: 30 }
export const mediaLimit = (type) => limitsMiB[type] * 1024 * 1024
export const canceledUpload = 'Subida cancelada. No se pudo confirmar si el servidor recibió el archivo.'
export const mediaAccept = [
  ...Object.keys(formats).map((extension) => `.${extension}`),
  ...new Set(Object.values(formats).map(([mime]) => mime)),
].join(',')

export function validateMediaFile(file) {
  if (!(file instanceof File)) return { error: 'Selecciona un archivo.' }
  if (!file.size) return { error: 'El archivo está vacío.' }
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1].toLowerCase()
  if (!Object.hasOwn(formats, extension)) return { error: 'Selecciona un archivo JPEG, PNG, WebP, MP4 o WebM.' }
  const [mime, type] = formats[extension]
  if (file.type && file.type !== mime) return { error: 'El tipo del archivo no coincide con su extensión.' }
  if (file.size > mediaLimit(type)) return { error: `El archivo supera el límite de ${limitsMiB[type]} MiB.` }
  return { type, mime }
}
