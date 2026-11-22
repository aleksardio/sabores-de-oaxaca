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

«Compartir receta» y «Compartir mi receta» siguen deshabilitados hasta contar
con la integración de publicación. El pie público ofrece un enlace separado
para **Ver demostración del panel**.

### Panel del cocinero (demostración visual)

| Ruta | Qué muestra |
| --- | --- |
| `/cocinero` | Redirige a «Mis recetas». |
| `/cocinero/recetas` | Cinco ejemplos, resumen por estado y filtros locales por estado y título. |
| `/cocinero/recetas/nueva` | Formulario vacío, verificación de requisitos y vista previa en la misma pantalla. |
| `/cocinero/recetas/:id/editar` | Editor en memoria si el estado lo permite; en los demás estados abre en modo lectura. |
| `/cocinero/recetas/:id/vista-previa` | Vista previa del ejemplo original. Si el ID no existe, muestra «Receta no encontrada». |

Los ejemplos de `src/data/demoCookRecipes.js` cubren `BORRADOR`, `PENDIENTE`,
`PUBLICADA`, `RECHAZADA` y `ARCHIVADA`. No son las recetas del catálogo público
ni pertenecen a cuentas o autores de demostración. Las categorías de
`src/data/recipeEditorOptions.js` son locales y se basan en el catálogo actual,
no en una consulta a MySQL. Las rutas no están protegidas ni asignan roles.

Puedes editar en memoria ejemplos en `BORRADOR` y practicar correcciones en
`RECHAZADA`, sin reabrirlo ni cambiar su estado. `PENDIENTE` queda en lectura
durante la revisión; `PUBLICADA` requiere retiro a `BORRADOR` en el servidor;
`ARCHIVADA` requiere que moderación la restaure a `PENDIENTE` para revisar de
nuevo. Guardar y enviar a revisión están deshabilitados. El formulario conserva
los cambios al alternar con la vista previa, pero los descarta al salir o
recargar. No usa almacenamiento del navegador ni API, y nada se publica o
agrega al catálogo.

**Figma:** se revisaron los frames 09 «Mis recetas», 10 «Publicar receta», 11
«Previsualización» y 12 «Editar receta». Se conservan la barra lateral café,
el fondo crema, las tarjetas de resumen, la tabla y la ilustración de la
vista previa. En móvil la navegación pasa arriba y la tabla se apila.
Se omitieron la cuenta, las notificaciones, los controles de sesión y las
cargas multimedia; se reemplazaron las métricas del prototipo por conteos
locales reales de los ejemplos. Los campos siguen el modelo de datos: tipo
y categorías separados, preparación por líneas y filas editables de ingredientes.

**Pruebas manuales:**

- Entra desde el pie público, filtra cada estado y añade una búsqueda que no
  coincida. Limpia los filtros y prueba el enlace de regreso al sitio público.
- Abre **Nueva receta**, comprueba los requisitos con campos vacíos y verifica
  que el foco vaya a **Título**. Añade y quita ingredientes; prueba una cantidad
  negativa y cambia la unidad a **Al gusto** (la cantidad debe vaciarse).
  Completa los campos, comprueba de nuevo y revisa que guardar y enviar sigan
  deshabilitados. Alterna con **Vista previa** y comprueba que los datos siguen
  en el formulario.
- Edita `demo-tostadas-calabaza` y recarga: debe restaurarse el título original.
  Abre `demo-dulce-amaranto` para practicar correcciones. Comprueba el modo
  lectura de `demo-infusion-guayaba`, `demo-quesadillas-flor` y
  `demo-caldo-garbanzos`, incluso al entrar por `/editar`. Prueba el ID
  `no-existe` en edición y vista previa.
- Revisa listado, creación, edición y vista previa a **320, 390, 768 y 1440 px**;
  las filas de ingredientes deben adaptarse sin desplazamiento horizontal.
  Comprueba por teclado el foco y la validación, y abre las rutas públicas y
  de autenticación para confirmar que siguen funcionando.

**Integración con Aleks:** conectar sesión y permisos reales (cuenta activa,
rol y propiedad verificados por el servidor), catálogos e identificadores
reales, listado y lectura de recetas propias, guardado, envío y transiciones
editoriales. Falta acordar el contrato de API, el manejo de errores y la
integración de multimedia. El servidor deberá validar todos los campos y
asignar el autor; la comprobación local no reemplaza esa validación.

### Panel de moderación (demostración visual)

| Ruta | Qué muestra |
| --- | --- |
| `/moderador` | Redirige a `/moderador/recetas`. |
| `/moderador/recetas` | Cola de revisión, conteos por estado, filtro y búsqueda por título. |
| `/moderador/recetas/:id` | Autor ficticio, receta de solo lectura y preparación de decisiones editoriales. |
| `/moderador/reportes` | Conteos, filtro y búsqueda por título de la receta relacionada. |
| `/moderador/reportes/:id` | Motivo, fecha ficticia, enlace a la receta y preparación de decisiones del reporte. |

Las rutas no están protegidas ni simulan una cuenta o un rol. Los ejemplos de
`src/data/demoModerationRecipes.js` y `src/data/demoModerationReports.js` son
independientes del catálogo público y del panel del cocinero. `demoReviewerId`
es solo una referencia para comprobar si coincide la autoría o el reportante.

| Recurso | Transiciones que se pueden preparar |
| --- | --- |
| Receta `PENDIENTE` | Aprobar → `PUBLICADA`; rechazar → `RECHAZADA` (con justificación). |
| Receta `PUBLICADA` | Archivar → `ARCHIVADA` (con justificación). Retirarla a `BORRADOR` corresponde al autor. |
| Receta `ARCHIVADA` | Restaurar → `PENDIENTE` para revisar de nuevo. |
| Receta `BORRADOR` o `RECHAZADA` | Sin acciones de moderación. El autor debe preparar o corregir el contenido y enviarlo a revisión. |
| Reporte `ABIERTO` | Pasar a `EN_REVISION`. |
| Reporte `EN_REVISION` | Resolver → `RESUELTO` o descartar → `DESCARTADO`, ambos con justificación. |
| Reporte `RESUELTO` o `DESCARTADO` | Sin más acciones. |

La coincidencia de autor bloquea toda decisión editorial; la coincidencia de
reportante bloquea toda decisión sobre el reporte. Gestionar un reporte y
moderar la receta son operaciones independientes: resolverlo no archiva la
receta. El formulario solo comprueba requisitos y muestra una propuesta
temporal. Confirmar sigue deshabilitado; no hay peticiones a la API, cambios
de estado, almacenamiento en el navegador ni eventos de auditoría en React.

**Figma:** se revisaron 15 «Panel», 16 «Revisar recetas», 17 «Reportes» y el
modal 23 de confirmación de eliminación. Se mantienen la barra lateral café,
el fondo crema y los resúmenes en tarjetas; `/moderador` lleva a la cola
en lugar de abrir otro tablero. Se usan tarjetas en lugar de tablas,
conteos derivados de los ejemplos y filtros locales por estado y búsqueda,
sin paginación ficticia, filtros de región/fecha ni controles de sesión.
No se usa «Reportada» como estado editorial ni «Pendiente» como estado de
reporte. En vez del modal de eliminación se prepara una decisión en el
detalle con confirmación deshabilitada. No se localizaron frames específicos
de detalle de moderación para una receta o un reporte; no se compararon
esas vistas con Figma.

**Pruebas:** `npm test` cubre transiciones, restricciones, justificación,
IDs inexistentes y que preparar una resolución no modifica la receta.
Para verificar en el navegador:

- Filtra las recetas por `Pendiente`, busca un título que no exista y limpia
  los filtros. Abre `demo-tamales-hongos`, comprueba el error sin acción y el
  error de rechazo sin justificación. Completa el campo, revisa la vista
  previa y recarga: la receta sigue pendiente y el formulario se reinicia.
  En `demo-crema-milpa` no debe ofrecerse ninguna acción editorial.
- En reportes, combina búsqueda y filtro. En `REP-002`, prepara resolver o
  descartar y abre la receta enlazada; ambos estados deben conservarse.
  En `REP-005` no debe haber acciones sobre el reporte; en `REP-006` sí,
  pero la receta enlazada no debe ofrecer acciones editoriales.
- Prueba `no-existe` en ambos detalles y los enlaces de regreso y al sitio
  público. Recorre los controles con Tab. Se verificaron las colas y los
  detalles a **320, 390, 768 y 1440 px**, sin desplazamiento horizontal.

**Integración con Aleks:** acordar el contrato de lectura y decisiones,
conectar autenticación, permisos, estados e identificadores reales y
gestionar errores y conflictos por cambios de estado concurrentes. Spring
Boot debe verificar cuenta activa, permisos, autoría, reportante, transición
y justificación, y registrar cada decisión efectiva y su auditoría en la
misma transacción.

### Panel de administración (demostración visual)

Abre `/admin` directamente. El menú permite volver al sitio público o ir al
panel del moderador, sin duplicar las pantallas de revisión y reportes.

| Ruta | Qué muestra |
| --- | --- |
| `/admin` | Redirige a `/admin/usuarios`. |
| `/admin/usuarios` | Resumen derivado de los ejemplos, búsqueda por nombre visible y filtros combinables por estado y rol asignado. |
| `/admin/usuarios/:id` | Datos ficticios de la cuenta y preparación de acciones. Un ID desconocido muestra «Usuario no encontrado». |
| `/admin/catalogos` | Categorías e ingredientes de solo lectura, con búsqueda independiente por nombre. |
| `/admin/recetas` | Listado con búsqueda por título o autor y filtros independientes de estado editorial y baja lógica. |

Los archivos `src/data/demoAdminUsers.js`, `src/data/demoAdminRecipes.js` y
`src/data/demoAdminCatalogs.js` contienen siete cuentas, seis recetas
administrativas, seis categorías y ocho ingredientes ficticios. Las recetas
no son las del sitio público ni las de los paneles anteriores. Los nombres de
las categorías coinciden con las opciones locales del cocinero. Las ocho
regiones siguen siendo datos locales del frontend y no se presentan como un
catálogo de MySQL.

- **Roles:** `USUARIO`, `COCINERO`, `MODERADOR` y `ADMIN` son los únicos códigos
  y son acumulables. Las cuentas nuevas reciben `USUARIO`. Solo `ADMIN`
  puede asignar o retirar roles y su permiso de moderación no implica que
  `MODERADOR` figure entre sus roles asignados. `ASIGNAR_ROL` rechaza roles
  duplicados y `RETIRAR_ROL` rechaza roles ausentes.
- **Cuentas:** `DESACTIVAR_CUENTA` se ofrece solo si está activa;
  `REACTIVAR_CUENTA`, solo si está desactivada. La baja sería lógica e
  impediría iniciar sesión u operar. Invalidar sesiones y recuperaciones
  pendientes y actualizar `version_tokens` corresponde al servidor; la
  reactivación no recupera sesiones.
- **Recetas:** `BAJA_RECETA` no cambia el estado editorial ni borra
  asociaciones, reportes o auditoría. `RESTAURAR_RECETA` quita la baja;
  si la receta estaba `PUBLICADA`, pasaría a `PENDIENTE` para nueva
  aprobación. Los demás estados se conservan, incluido `ARCHIVADA`.
  Restaurar no es aprobar ni publicar. No hay borrado físico.

Las seis acciones solo se previsualizan y exigen una justificación no vacía
de hasta 1000 caracteres. La confirmación está deshabilitada. No se modifica
ningún ejemplo, no se usa almacenamiento del navegador ni API y React no
registra auditoría. No hay autenticación simulada ni rutas protegidas:
ocultar un control en React no reemplaza la autorización del servidor.

**Figma:** se revisaron los frames 19 «Administrador · Recetas» y 20
«Administrador · Usuarios». Se conservaron barra lateral café, fondo crema,
acentos terracota y verde y tablas en escritorio. En móvil, las filas se
apilan y la navegación pasa arriba. Se omitieron correo, controles de
sesión, notificaciones, paginación ficticia y filtros de región y fecha.
Se distinguió la baja lógica del estado editorial; en vez de editar o
rechazar recetas desde administración, se prepara la baja o restauración y
se enlaza a moderación. No se localizaron frames específicos de detalle de
cuenta, gestión de roles, catálogos ni auditoría. El detalle y los catálogos
se adaptaron al layout existente; no se añadieron formularios de catálogos
ni una pantalla de historial. `/admin` abre Usuarios en vez de un dashboard.

**Pruebas:** `npm test` (51 aprobadas, 12 nuevas), `npm run build` y
`npm run lint` completados. En Chromium se verificaron redirección, enlaces,
búsquedas y filtros, estados vacíos, detalle inexistente, foco de validación,
apertura por teclado, confirmación deshabilitada, las seis vistas previas y
que recargar descarta la propuesta. Los listados, el detalle de cuenta,
catálogos y la vista previa de receta se comprobaron a **320, 390, 768 y
1440 px**, sin desplazamiento horizontal. También se comprobó la apertura
de Inicio, Catálogo, Detalle, Tradiciones, Perfil, Autores, Favoritos,
autenticación visual y ambos paneles anteriores.

**Integración con Aleks:** acordar el contrato de API, las decisiones sobre
los propios roles y la última cuenta `ADMIN`, y el tratamiento de errores y
cambios concurrentes. Spring Boot debe comprobar cuenta activa, autorización
y reglas en cada solicitud. El servidor registrará actor, recurso afectado,
acción, rol si aplica, detalle y fecha en MySQL dentro de la misma transacción
que el cambio; restaurar una baja que estaba `PUBLICADA` requiere además
la auditoría editorial `RESTAURAR_BAJA`. Quedan por acordar acceso y retención
del historial. Para una futura edición de catálogos, validar nombres no
vacíos y límites de 100/255 caracteres para nombre/descripción de categoría
y 150 para nombre de ingrediente.

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
npm test         # Formularios, porciones, recetas, regiones, autores y paneles de demostración
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
```

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/tlayuda`.
