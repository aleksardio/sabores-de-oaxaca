function photo(file, place, alt, title, author, license = 'BY-SA 4.0') {
  const [terms, version] = license.toLowerCase().split(' ')
  return {
    src: `${import.meta.env?.BASE_URL ?? '/'}tradiciones/${file}.webp`,
    place, alt, title, author,
    source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title.replaceAll(' ', '_'))}`,
    license: `CC ${license}`,
    terms: `https://creativecommons.org/licenses/${terms}/${version}/`,
  }
}

export const marketPhoto = photo('mercado', 'Mercado 20 de Noviembre, Oaxaca de Juárez',
  'Puestos de comida en el pasillo de las carnes asadas',
  'Pasillo del humo o de la carne asada, Mercado 20 de noviembre Oaxaca.jpg', 'ProtoplasmaKid')

// Guía cultural editorial; no representa un catálogo ni un filtro de la API.
export const regions = [
  {
    name: 'Cañada',
    photo: photo('canada', 'Sistema Huautla, Sierra Mazateca', 'Poza entre formaciones rocosas en el interior de la cueva',
      'Sistema Huautla 2.jpg', 'Kasia Biernacka'),
    description: 'Los paisajes de cerros y valles invitan a conocer los ingredientes de temporada y las distintas maneras de llevarlos a la mesa.',
  },
  {
    name: 'Costa',
    photo: photo('costa', 'Playa Zicatela, Puerto Escondido', 'Surfistas y olas al atardecer',
      'Surf at Sunset - Zicatela Beach - Puerto Escondido - Oaxaca - Mexico (6533419239).jpg', 'Adam Jones', 'BY-SA 2.0'),
    description: 'El pescado en hoja de plátano es un ejemplo de cómo se encuentran los ingredientes del mar y la tierra en la cocina.',
  },
  {
    name: 'Istmo',
    photo: photo('istmo', 'Juchitán de Zaragoza', 'Patio de la Casa de la Cultura de Juchitán',
      'Casa de la cultura de Juchitán.jpg', 'DeBolsillo'),
    description: 'Las garnachas istmeñas, con tortillas doradas y col encurtida, son una forma de acercarse a los antojitos de la región.',
  },
  {
    name: 'Mixteca',
    photo: photo('mixteca', 'Huajuapan de León', 'Vista del centro de Huajuapan de León',
      'Centro de Huajuapan de León 01.jpg', 'Fernando2812l'),
    description: 'Las memelas muestran cómo la masa de maíz, el comal y los frijoles pueden reunirse en un antojito para compartir.',
  },
  {
    name: 'Papaloapan',
    photo: photo('papaloapan', 'Río Papaloapan, Tuxtepec', 'Vista de la ciudad de Tuxtepec desde el puente sobre el río',
      'Tux Papaloapan river.JPG', 'Vladimir Herman', 'BY 2.5'),
    description: 'El caldo de piedra invita a descubrir la relación entre los ríos y la cocina de la región.',
  },
  {
    name: 'Sierra Norte',
    photo: photo('sierra-norte', 'Capulálpam de Méndez', 'Vista de Capulálpam de Méndez',
      'Capulalpam - panoramio.jpg', 'Hari Seldon', 'BY-SA 3.0'),
    description: 'Los tamales de chepil reúnen la masa de maíz y el aroma de las hierbas en una preparación cocida al vapor.',
  },
  {
    name: 'Sierra Sur',
    photo: photo('sierra-sur', 'Miahuatlán de Porfirio Díaz', 'Vista del centro de Miahuatlán de Porfirio Díaz',
      'Miahuatlán Oaxaca.jpg', 'Geografo01'),
    description: 'Una taza de chocolate de agua ofrece un punto de partida para explorar las bebidas y los sabores de la región.',
  },
  {
    name: 'Valles Centrales',
    photo: photo('valles-centrales', 'Monte Albán', 'Edificio J en la zona arqueológica de Monte Albán',
      'Building J, Monte Alban, Oaxaca, Mexico.jpg', 'Mesoamerican'),
    description: 'De las tlayudas al tejate, el maíz toma formas distintas en las cocinas y los mercados de los valles.',
  },
]
