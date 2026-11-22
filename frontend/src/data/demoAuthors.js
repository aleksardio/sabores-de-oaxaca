// Perfiles ficticios para el directorio público; no tienen recetas asociadas.
export const demoAuthors = [
  {
    id: 'ejemplo',
    nombre_visible: 'Luna del Comal',
    biografia: 'Me gusta conversar sobre las distintas maneras de preparar el maíz y escuchar las historias que se cuentan alrededor del comal.',
    initials: 'LC',
  },
  {
    id: 'ejemplo-2',
    nombre_visible: 'Sol de la Milpa',
    biografia: 'Disfruto recorrer los mercados y descubrir qué ingredientes llegan con cada temporada.',
    initials: 'SM',
  },
]

export function findDemoAuthor(id) {
  return demoAuthors.find((author) => author.id === id)
}
