# Sabores de Oaxaca · Frontend

Aplicación en JavaScript con React, Vite y React Router. Inicio, Catálogo y el
detalle toman como referencia los frames «01 · Inicio público»,
«02 · Explorar recetas» y «04 · Detalle de receta» (2, 4 y 6 personas) de Figma.
Las composiciones de tablet y móvil son adaptaciones del escritorio.
Las ilustraciones se recrean con CSS y las fuentes Fraunces e Inter se cargan
desde Google Fonts.
No requiere iniciar el backend: el catálogo usa datos locales y los formularios
de autenticación solo validan entradas en el navegador.

## Instalar y ejecutar

Usa Node.js 22.13 o posterior (se recomienda Node.js 24) y npm.
Desde la raíz del repositorio:

```sh
cd frontend
npm ci
npm run dev
```

Abre la URL que indique Vite (habitualmente `http://localhost:5173`).

## Probar la navegación

| Ruta | Qué comprobar |
| --- | --- |
| `/` | La portada, «Explorar recetas», las tres tarjetas destacadas y sus enlaces «Ver receta». |
| `/recetas` | El catálogo, la búsqueda, los filtros, las páginas de seis recetas y los enlaces a cada detalle. |
| `/recetas?region=Mixteca` | El selector inicia en Mixteca y el catálogo muestra Memelas. |
| `/tradiciones` | La introducción, las ocho regiones y los enlaces al catálogo. |
| `/tradiciones#regiones` | Acceso directo a la sección: el navegador desplaza la vista y enfoca el título. |
| `/recetas/tlayuda` | Ingredientes, preparación, base de dos porciones y enlace de vuelta. |
| `/recetas/no-existe` | El mensaje «Receta no encontrada» y el enlace al catálogo. |
| `/perfil` | Estado de visitante, enlaces a login y registro y «Vista previa de diseño» no editable. |
| `/autores` | Directorio de perfiles ficticios, marcados como ejemplos. |
| `/autores/ejemplo` y `/autores/ejemplo-2` | Perfil público de demostración, aviso sobre las recetas asociadas y enlace al catálogo. |
| `/autores/no-existe` | «Autor no encontrado» y enlace al directorio. |
| `/favoritos` | Estado de visitante, enlaces a login y al catálogo, sin favoritos simulados. |
| `/login` | Acceso con correo y contraseña, mostrar u ocultar contraseña y enlaces a alta y recuperación. |
| `/registro` | Alta con nombre visible, correo, contraseña y confirmación. |
| `/recuperar-contrasena` | Solicitud de recuperación por correo y enlace de regreso al login. |
| `/no-existe` | La página de ruta desconocida y el enlace al inicio. |

Prueba también recargar directamente un detalle y navegar con una ventana
estrecha: el menú debe ajustarse y las tarjetas deben reorganizarse.

«Compartir receta» y «Compartir mi receta» esperan la pantalla de publicación.

### Tradiciones y regiones

- Desde Inicio, pulsa **Tradiciones** en la barra para abrir la introducción.
  **Conocer las regiones** en Inicio y **Por región** en el catálogo deben ir
  directamente a la sección de las ocho regiones. Abre también
  `/tradiciones#regiones` en una pestaña nueva.
- Desde la tarjeta de Mixteca, pulsa **Ver recetas** y recarga el catálogo:
  Mixteca y Memelas deben seguir seleccionada y visible, respectivamente.
  Desde Cañada, comprueba que el catálogo indique **No encontramos recetas**.
- A **320, 390, 768 y 1440 px**, comprueba que se muestran las ocho tarjetas,
  en una, una, dos y cuatro columnas respectivamente, sin desplazamiento
  horizontal. Recorre los enlaces con Tab y comprueba que el foco es visible.

La página usa Fraunces e Inter, la paleta del sitio e ilustraciones CSS; la
pantalla de Tradiciones del prototipo no se pudo verificar en Figma.

### Perfil, autores y favoritos

- Usa los enlaces **Mi perfil**, **Autores** y **Favoritos** del pie público.
  Comprueba que **Iniciar sesión** y **Crear una cuenta** abren sus formularios
  sin la cabecera ni el pie públicos.
- En **Mi perfil**, la vista previa muestra un nombre ficticio y los límites
  de `nombre_visible` (100 caracteres) y `biografia` (opcional, hasta 1000).
  No se usa una URL de avatar; `avatar_url` es opcional. No hay edición ni guardado.
- Abre los dos perfiles desde el directorio y prueba también un identificador
  desconocido. Los autores ficticios viven en `src/data/demoAuthors.js`; las 14
  recetas no tienen autor asignado y no se relacionan con esos perfiles.
- Desde cada autor y desde **Favoritos** puedes abrir el catálogo público.
  **Favoritos** no muestra ni guarda recetas personales. Estas vistas no crean
  sesiones, no hacen peticiones a la API y no guardan datos en el navegador.
- Recarga las rutas nuevas directamente. A **320, 390, 768 y 1440 px**, revisa
  que no haya desplazamiento horizontal, que el directorio se reorganice y
  que todos los enlaces tengan foco visible al recorrerlos con Tab.

**Figma:** se revisaron los frames «05 · Perfil público del autor»,
«13 · Cocinero · Favoritos y compras» y «14 · Cocinero · Mi perfil». El perfil
público conserva la cabecera con iniciales y texto, sin métricas ni recetas
atribuidas. Las vistas personales usan el layout público en lugar del panel
de cocinero: no muestran ajustes de cuenta, favoritos guardados ni una lista
de compras. El directorio de autores es una vista nueva.

**Verificado:** enlaces de las nuevas vistas, recarga directa, foco visible
por teclado y ausencia de desplazamiento horizontal a 320, 390, 768 y 1440 px.
También se comprobó que Inicio, Catálogo, Detalle, Tradiciones y las tres rutas
de autenticación siguen abriendo.

Para la integración con Aleks quedan la sesión real, la consulta y edición del
perfil propio, los perfiles públicos y su relación con recetas reales, y la
consulta y gestión de favoritos propios. El servidor asignará `USUARIO` a cuentas
nuevas, decidirá los permisos y verificará la cuenta activa y la propiedad.
Solo se mostrarán como favoritas las recetas visibles según el servidor:
publicadas, no eliminadas y de autores activos.

### Formularios de autenticación

Las tres rutas usan un layout propio inspirado en los frames 06, 07 y 08
de Figma, sin la cabecera ni el pie públicos. En pantallas estrechas el
panel de marca se compacta y el formulario queda en una columna.

- En login, envía los campos vacíos, prueba un correo sin `@` y usa
  **Mostrar/Ocultar contraseña** con el teclado.
- En registro, prueba los campos vacíos, contraseñas diferentes, un nombre
  de 101 caracteres o un correo de 255. Los máximos son 100 y 254,
  respectivamente. No se solicita un rol ni se exige una composición de
  contraseña pendiente de acuerdo con Aleks.
- En recuperación, prueba un correo vacío y uno mal formado. Regresa a login
  y recorre los enlaces a las tres pantallas y al inicio.
- Al corregir un error, su mensaje debe desaparecer. Un envío válido solo
  anuncia que la función estará disponible cuando se conecte el servidor.
  No se inicia sesión, crea una cuenta ni envía un correo. No hay peticiones,
  tokens ni almacenamiento de credenciales; las contraseñas se limpian tras
  un envío válido.
- Revisa las tres rutas a **320, 390, 768 y 1440 px**: sin desplazamiento
  horizontal, con las acciones accesibles y scroll vertical cuando se necesite.

Para la integración faltan el contrato de la API, la política de contraseña,
el manejo de sesión y destinos según permisos del servidor, y el flujo de
restablecimiento desde un enlace de recuperación.

### Búsqueda y filtros del catálogo

- Escribe y pulsa **Enter** o **Buscar recetas**. La consulta ignora
  mayúsculas y acentos y busca cada palabra en el nombre, los ingredientes,
  la categoría, la región o la duración mostrada. Prueba `MAIZ MIXTECA`.
- Se puede combinar una región con un filtro: **Tradicionales** usa la
  marca de tradición, **Rápidas** incluye hasta **30 minutos**, **Dulces** y
  **Bebidas** usan la categoría, y **Con video** usa un indicador de prueba
  (no hay reproductor ni videos enlazados). **Todas** no limita por tipo.
- Desde la página 2 del catálogo, cambia a **Valles Centrales** y comprueba
  que `region` aparece en la URL y el listado vuelve a la página 1.
  **Limpiar filtros** borra la búsqueda y elimina `region` sin quitar otros
  parámetros. Con **Atrás** y **Adelante** el selector y los resultados
  deben reflejar la URL. `?region=Desconocida` muestra todas las regiones.

Los registros y sus metadatos son provisionales. La API todavía no interviene
en el listado, la búsqueda, los filtros, la paginación ni los detalles.

### Detalle y calculadora de porciones

- Recorre las tres páginas del catálogo (6, 6 y 2 tarjetas) y abre cada enlace
  «Ver receta». Deben verse el nombre correspondiente, los ingredientes y la preparación.
- En `/recetas/mole-negro`, prueba **4 → 2 → 6 → 4**. El pollo debe mostrar
  **300 → 150 → 450 → 300 g**, y las tortillas **2 → 1 → 3 → 2 piezas**.
  La URL no cambia. El botón activo se distingue visualmente y con `aria-pressed`.
- En `/recetas/ensalada-de-nopales-con-quesillo`, el detalle abre para **3 personas**
  sin que ninguno de los tres botones esté marcado. Al cambiar el número,
  la sal sigue mostrando **«Al gusto»**.
- Comprueba los anchos **320, 390, 768 y 1440 px** con las herramientas del
  navegador. En celular las tarjetas se apilan; no debe aparecer desplazamiento horizontal.
- Vuelve al catálogo y busca `MAIZ MIXTECA`: debe aparecer **Memelas**.
  Comprueba también la paginación y la combinación de **Bebidas** con **Valles Centrales**.

En `src/data/recipes.js`, `ingredients` conserva sus cadenas para la búsqueda.
El detalle usa `baseServings`, `ingredientDetails` y `preparation`. Las cantidades
base son decimales en texto con punto (o `null` para `AL_GUSTO`); la vista usa
coma decimal y mantiene la unidad original. `preparation` es texto: cada línea
no vacía se muestra como un paso. Las cantidades e instrucciones son
demostrativas, no versiones históricas verificadas.

## Comprobaciones locales

```sh
npm test         # Validación de formularios, porciones, recetas, regiones y autores
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
```

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/tlayuda`.
