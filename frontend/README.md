# Sabores de Oaxaca · Frontend

Aplicación en JavaScript con React, Vite y React Router. Inicio, Catálogo y el
detalle toman como referencia los frames «01 · Inicio público»,
«02 · Explorar recetas» y «04 · Detalle de receta» (2, 4 y 6 personas) de Figma.
Las composiciones de tablet y móvil son adaptaciones del escritorio.
Las ilustraciones se recrean con CSS y las fuentes Fraunces e Inter se cargan
desde Google Fonts.
Inicio, el catálogo y el detalle consultan la API pública. El registro, el
inicio de sesión, el perfil, los favoritos, el panel del cocinero y la
moderación de recetas y reportes y la administración de usuarios, catálogos y
recetas también requieren el backend. El directorio público de autores de
demostración se retiró; los autores reales permanecen en las recetas.

## Instalar y ejecutar

Usa Node.js 22.13 o posterior (se recomienda Node.js 24) y npm.
Desde la raíz del repositorio:

```sh
cd frontend
npm ci
npm run dev
```

Abre la URL que indique Vite (habitualmente `http://localhost:5173`).

### Backend para catálogo y autenticación local

1. Prepara JDK 17, MySQL 8 y una base local con permisos para las migraciones
   Flyway. Configura `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` y `JWT_SECRET_BASE64`
   según el [README del backend](../backend/README.md), sin versionar secretos.
2. Desde `backend/`, arranca Spring Boot con `dev`:
   `.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"`. No uses
   `bootstrap`: no conecta a MySQL. Para probar con recetas visibles, usa
   únicamente una base de desarrollo autorizada y sigue las instrucciones
   de [datos de prueba locales](../backend/datos-demo-local/README.md).
3. Arranca Vite en otra terminal. El navegador usa rutas relativas `/api`;
   solo `npm run dev` las reenvía a `http://localhost:8080`. `npm run preview`
   y el build no incluyen ese proxy. Para desplegar, sirve `/api` en el
   mismo origen con un proxy inverso. Si el equipo decide llamar a otro
   origen directamente desde el navegador, Aleks deberá configurar CORS
   para el origen concreto de Vite (esquema, host y puerto), solo para los
   métodos y encabezados necesarios, nunca con `*`.

Si no conecta o aparece un 5xx, comprueba que Spring Boot escuche en el
puerto 8080 y haya iniciado con `dev`; revisa MySQL, Flyway y las variables
requeridas. `/api/v1/public/health` sirve para confirmar que el proceso responde,
pero no garantiza que la autenticación con MySQL funcione. Un 401 en login
indica que las credenciales no son válidas; un 401 en `/me` o `/logout` indica
que la sesión no es válida. Un 403 es falta de autorización, no un 401.

## Probar la navegación

| Ruta | Qué comprobar |
| --- | --- |
| `/` | La portada, hasta tres recetas reales para descubrir y sus enlaces «Ver receta»; si no hay recetas, un estado vacío. |
| `/recetas` | El catálogo, la búsqueda por título, el tipo, las categorías dinámicas y las páginas de seis recetas. |
| `/recetas?region=Mixteca` | Aviso de filtro regional no disponible y enlace al catálogo completo. |
| `/tradiciones` | La introducción, las ocho regiones editoriales y el enlace al catálogo completo. |
| `/tradiciones#regiones` | Acceso directo a la sección: el navegador desplaza la vista y enfoca el título. |
| `/recetas/1` | Detalle y porciones base, si el ID 1 está disponible en la base; utiliza un ID visible del catálogo. |
| `/recetas/no-existe` | «Receta no encontrada» sin hacer una solicitud con ID inválido. |
| `/perfil` | Enlaces a login y registro como visitante; nombre, correo, roles y cierre de sesión al autenticarte. |
| `/autores` y `/autores/ejemplo` | Rutas antiguas: muestran la página normal de recurso no encontrado. |
| `/favoritos` | Favoritos personales de la API; carga, vacío, reintento y eliminación. Para visitantes, enlace a login con retorno y al catálogo. |
| `/login` | Acceso con correo y contraseña, mostrar u ocultar contraseña y enlaces a alta y recuperación. |
| `/registro` | Alta con nombre visible, correo, contraseña y confirmación. |
| `/recuperar-contrasena` | Solicitud por correo con respuesta genérica; no confirma ni envío ni entrega. |
| `/restablecer-contrasena` | Nueva contraseña desde un enlace con fragmento válido; sin el enlace, ofrece volver a abrirlo o solicitar otro. |
| `/no-existe` | La página de ruta desconocida y el enlace al inicio. |

Prueba también recargar directamente un detalle y navegar con una ventana
estrecha: el menú debe ajustarse y las tarjetas deben reorganizarse.

### Créditos de fotografía en recetas públicas

La API sigue enviando `descripcion` como texto y `multimedia` con `id`,
`tipo`, `url`, `textoAlternativo` y `orden`. No hay campos de atribución.
Para nuevos lotes, escribe solo la descripción culinaria al principio y agrega
el crédito en una línea independiente, después de una línea en blanco:

```text
Foto: «Título de la obra», Autor, Colección. CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/. Fuente: https://commons.wikimedia.org/wiki/File:Nombre.jpg — recortada y recodificada sin metadatos.
```

Usa el crédito y la licencia reales, y omite ` — modificaciones` si no hubo
ninguna. Mantén `textoAlternativo` para describir la imagen, no para atribuirla.
La tarjeta omite las líneas `Foto:` y las URL del texto, y muestra hasta tres
líneas. En el detalle, la atribución reconocida se coloca bajo la imagen con
enlaces etiquetados. Una línea `Foto:` no estructurada conserva su texto y, si
contiene enlaces HTTPS válidos, los presenta como referencias.

Es una convención de presentación, no una migración: no cambia el dato
almacenado ni permite asociar formalmente créditos a IDs de multimedia. Usa
la convención para la foto de portada; no presupongas que distingue varias
fotos o videos. El editor, la API y otros consumidores siguen viendo el valor
original. Atribuciones que no empiezan con `Foto:` no se reinterpretan.

### Panel del cocinero

**Mis recetas** está en el perfil y en el pie público. **Compartir mi receta**
en Inicio y **Compartir receta** en la barra de navegación abren el formulario
solo con `COCINERO`. Sin sesión, llevan al login con un destino interno
validado. Si la cuenta no tiene ese rol, la acción explica cómo solicitarlo a
un administrador. Ni `ADMIN` ni `MODERADOR` implican `COCINERO`.
`/cocinero` lleva a `/cocinero/recetas`. Cualquier cuenta autenticada puede
consultar sus propias recetas. Spring Boot decide el acceso definitivo.
Un `401` invalida la sesión local; un `403` muestra acceso denegado sin cerrarla.
El JWT solo vive en memoria.

| Endpoint bajo `/api/v1` | Operación |
| --- | --- |
| `GET /mis-recetas?pagina=0&tamano=12` | Listado paginado por el servidor y total global. Filtros y conteos por estado solo para la página actual. |
| `GET /mis-recetas/{id}` | Consulta el detalle propio, incluidas las bajas, antes de editar o previsualizar. |
| `POST /mis-recetas` | Crea un borrador sin enviar versión, autor ni estado. Tras `201` abre su editor. |
| `PUT /mis-recetas/{id}` | Reemplaza el contenido completo, con `version` en el JSON. Solo `BORRADOR` y `RECHAZADA` activas. Conserva la nueva versión del `200`. |
| `POST /mis-recetas/{id}/enviar-revision` | Envía `BORRADOR` o reenvía `RECHAZADA`, siempre que sea propia, activa y completa. Si hay cambios, primero los guarda por PUT. Envía `If-Match` con la versión vigente entre comillas (p. ej. `"4"`), sin cuerpo. Solo tras un `200` válido muestra `PENDIENTE`, no `PUBLICADA`. |
| `DELETE /mis-recetas/{id}` | Confirma explícitamente y envía `If-Match` entre comillas, sin cuerpo. Tras `204` vuelve a consultar el detalle. La baja no cambia el estado editorial y no se puede restaurar desde aquí. |
| `POST /multimedia/uploads` | Sube un archivo con la sesión de cocinero. No modifica la receta. |
| `GET /categorias` | Carga el catálogo con el servicio público existente, sin Bearer. |
| `GET /ingredientes` | Carga el catálogo público sin JWT como un arreglo de `{id, nombre}` en el orden del servidor. |

Contrato: [RECETAS_COCINERO_API.md](../backend/docs/RECETAS_COCINERO_API.md).
El borrador permite guardar sin categorías, ingredientes ni multimedia.
Para revisión se requiere al menos una categoría y un ingrediente. En el JSON
de la receta, multimedia sigue siendo una lista de referencias HTTPS (`IMAGEN`
o `VIDEO`), no los archivos.
El editor conserva los IDs, nombres y cantidades base del detalle y vuelve
a enviar las asociaciones completas al guardar.

- **Ingredientes:** **Buscar ingrediente por nombre** muestra hasta 20
  resultados directamente seleccionables del catálogo de `GET /api/v1/ingredientes`,
  sin nuevas solicitudes HTTP al escribir. No distingue mayúsculas ni
  acentos: `maiz` encuentra `Maíz` y `Masa de maíz` si están en el catálogo.
  Usa Tab para llegar a un resultado y actívalo para agregarlo y enfocar su
  cantidad. No se agregan duplicados. Las filas existentes no se filtran;
  puedes quitar un ingrediente o cambiarlo con su selector sin perder la
  cantidad, unidad, orden ni nota. Si no hay coincidencias, se muestra un aviso.
  La vista previa muestra el nombre; el JSON envía `ingredienteId`, no
  el nombre. El editor indica carga, catálogo vacío, error de conexión o
  respuesta inesperada. Puedes reintentar sin perder datos ni bloquear el
  resto del formulario. Si el catálogo no incluye un ingrediente existente,
  conserva su ID y nombre, lo marca como no disponible y permite quitarlo
  o sustituirlo. El servidor valida definitivamente las referencias.
- **Validaciones:** los errores aparecen al salir de un campo inválido o al
  intentar guardar o revisar, se actualizan al corregirlo y no mueven el foco
  mientras escribes. Un intento inválido enfoca el primer problema sin enviar
  solicitudes. Los requisitos exclusivos para revisión se muestran aparte.
  Archivos pendientes, operaciones en curso y conflictos bloquean las acciones
  y muestran el motivo.
- **Reenvío:** usa **Reenviar a revisión** desde el editor de una receta
  rechazada. No requiere una modificación si ya está completa. Un PUT exitoso
  conserva `RECHAZADA` y devuelve la versión para el POST; un PUT fallido
  impide el POST. Si falla el POST después del PUT, los cambios guardados y
  su versión se conservan. No se muestra un motivo de rechazo que el detalle
  privado no devuelve.
- **Conflictos (`409`):** se conservan los cambios en el editor. Consulta el
  detalle del servidor, compara ambas versiones y elige qué datos usar.
  Adoptar la versión no escribe ni reintenta; si aún se puede editar,
  guarda de nuevo explícitamente. Salir de la pantalla, cerrar sesión o
  recargar descarta los cambios que no se hayan guardado.
- **Diseño:** se mantiene la composición de los frames 09–12 de Figma:
  barra lateral, tarjetas de resumen, tabla, formulario y vista previa.
  En móvil la navegación pasa arriba y la tabla se apila.

**Cómo comprobar el flujo desde React:** usa HTTP simulado o un entorno de
desarrollo aislado y autorizado; nunca producción.

1. Inicia sesión como `COCINERO` y abre **Mis recetas → Nueva receta**.
   Comprueba en Red el GET público de ingredientes sin Bearer. Guarda un
   borrador sin ingredientes; vuelve a editarlo, elige una categoría y agrega
   ingredientes. Busca por nombre sin acentos; comprueba que no se hagan
   nuevos GET ni se pierdan las selecciones al cambiar o borrar la búsqueda.
   Comprueba que no se repiten, que la vista previa muestra
   nombres y que las cantidades y notas se conservan al sustituirlos.
2. Usa **Enviar a revisión**. Con otra cuenta de prueba autorizada, rechaza
   la receta desde moderación. Vuelve a abrirla como su cocinero: comprueba el
   aviso y el botón **Reenviar a revisión**.
3. Corrige la receta y reenvíala. En Red, verifica que el PUT usa la versión del
   detalle y que el POST no lleva cuerpo y usa, entre comillas, la versión
   devuelta por el PUT. Comprueba que solo se muestra **Pendiente** tras el
   éxito y que aún no está publicada. Con otra receta rechazada ya completa,
   reenvía sin tocar campos y verifica que se hace solo el POST.
4. Con HTTP simulado, prueba catálogo vacío (`[]`), fallo de red, respuesta
   inválida y reintento sin perder cambios. Simula `409` y comprueba que la
   comparación se abre sin reintentos de escritura. Revisa el selector y
   la vista previa a 320, 390, 768 y 1440 px.

`npm test` comprueba estos contratos con HTTP simulado. En Chromium, también
con HTTP simulado, se comprobaron creación, edición, catálogo vacío y fallido,
selector por teclado, vista previa, rechazo, reenvío y `409` a 320, 390, 768 y
1440 px, sin desplazamiento horizontal. La validación de extremo a extremo
con Spring Boot y MySQL (roles, referencias y concurrencia real) queda pendiente.

#### Subir fotos y videos

`POST /api/v1/multimedia/uploads` requiere Bearer JWT y rol `COCINERO`.
Se envía un solo archivo por solicitud en `multipart/form-data`, con el
campo exacto `archivo`. El navegador genera el `boundary` y la sesión añade
el Bearer sin exponerlo al formulario. Solo se confirma con HTTP `201` y un
JSON válido:

```json
{
  "tipo": "IMAGEN",
  "url": "https://archivos.example/uploads/foto.jpg",
  "nombreOriginal": "foto.jpg",
  "tamanoBytes": 12345
}
```

| Archivos | MIME | Máximo |
| --- | --- | --- |
| `.jpg`, `.jpeg`; `.png`; `.webp` | `image/jpeg`; `image/png`; `image/webp` | 5 MiB (5 242 880 bytes) |
| `.mp4`; `.webm` | `video/mp4`; `video/webm` | 30 MiB (31 457 280 bytes) |

El editor comprueba la extensión y el tamaño no nulo. Si el navegador no
declara un MIME, se usa el de la extensión admitida en el archivo multipart,
sin cambiar sus bytes, nombre ni fecha de modificación. Si declara un MIME
incompatible, el editor rechaza el archivo en vez de sustituirlo. Spring Boot
comprueba el MIME declarado y la firma real del archivo. La respuesta debe
tener el tipo del archivo, URL HTTPS sin credenciales, nombre no vacío y tamaño
entero positivo dentro del límite. El reproductor HTML5 admite MP4 y WebM sin
autoplay: en detalle público, editor, vista previa y moderación solo incrusta
referencias HTTPS cuyo `URL.origin` sea exactamente
`https://media.saboresdeoaxaca.food`. Una referencia HTTPS válida conserva
su enlace alternativo; si falla la reproducción, se muestra también un aviso.
La política `media-src` también bloquea redirecciones de reproducción hacia
otros orígenes. Las vistas previas locales siguen usando URLs `blob:` revocables.

> **Privacidad:** Los archivos subidos serán públicos aunque la receta
> todavía sea un borrador. No subas información privada ni fotografías o
> videos sin autorización. El editor muestra este aviso antes de seleccionar
> o subir archivos.

1. En **Multimedia**, elige una foto o un video. El editor muestra nombre,
   tamaño y vista previa local. Puedes cambiar de archivo o alternar entre
   **Editar** y **Vista previa** sin perderlo.
2. Pulsa **Subir archivo**. Se sube uno a la vez, sin porcentajes ni
   reintentos automáticos. Un `400` indica archivo rechazado; un `413`, tamaño
   excesivo; un `500`, error interno. Un `401` invalida la sesión; un `403`
   no la cierra. Si falla la conexión, se cancela o el `201` no es válido,
   la subida no se puede confirmar. Comprueba el estado antes de reintentar
   manualmente: el servidor podría haber recibido el archivo.
3. Tras **Archivo subido. Guarda la receta para asociarlo.**, ajusta el orden
   y texto alternativo y guarda explícitamente. Solo se envían `tipo`, `url`,
   `textoAlternativo` y `orden` por referencia. Un guardado fallido conserva la
   subida confirmada. Si hay archivos pendientes, con error o cancelados,
   resuélvelos o quítalos antes de guardar o enviar a revisión.
4. **Quitar referencia** solo cambia el formulario, no borra el archivo del
   VPS. En una receta existente, hay que guardar el cambio con éxito para que
   se aplique. No hay endpoint de borrado físico; el backend gestionará los
   archivos huérfanos. Cerrar el editor descarta las vistas previas locales
   y los cambios que no se guardaron.

La comprobación en Chromium a **320, 390, 768 y 1440 px** usó respuestas
HTTP simuladas. Cubrió selección, reemplazo, vistas previas, error y reintento,
cancelación, retirada, guardado, edición, conflicto y visualización en el
detalle público y moderación, sin desplazamiento horizontal.

**Pruebas reales pendientes:** cuando Aleks confirme el despliegue y el origen
público, usa un entorno de pruebas autorizado y una cuenta `COCINERO` de prueba.
Sube una imagen y un video pequeños y confirma en Red que cada solicitud tiene
un `archivo`, devuelve `201` y una URL pública HTTPS que realmente sirve el
archivo. Guarda y reabre el borrador, quita una referencia y vuelve a guardar;
comprueba que el detalle y la moderación muestran la asociación esperada.
Prueba además un formato que deba rechazarse, exceso de tamaño y una cuenta de
prueba sin el rol. No uses credenciales reales ni subas archivos a producción
para verificar este cambio. Las pruebas con HTTP simulado no comprueban el VPS.

### Panel de moderación

Abre **Panel de moderación** desde el perfil o entra a `/moderador`, que
redirige a `/moderador/recetas`. Sin sesión se abre el login con retorno
interno validado. Se admite `MODERADOR` o `ADMIN`, sin jerarquía entre roles;
sin esos roles no se hacen consultas privadas de moderación. Ninguna cuenta
puede decidir sobre sus propias recetas, aunque tenga ambos roles. Spring Boot
conserva la autorización definitiva. Un `401` invalida la sesión; un `403` no.

| Endpoint bajo `/api/v1` | Operación |
| --- | --- |
| `GET /moderacion/recetas?pagina=0&tamano=12&tipo=COMUN` | Cola de pendientes no eliminadas. `pagina` comienza en cero; `tipo` es opcional y admite `COMUN` o `TRADICIONAL_OAXAQUENA`. El servidor filtra y pagina. |
| `GET /moderacion/recetas/{id}` | Detalle pendiente de solo lectura, incluida la versión vigente. Muestra cantidades base sin recalcular y referencias multimedia con el mismo reproductor de origen autorizado, sin HTML arbitrario. |
| `POST /moderacion/recetas/{id}/aprobar` | Tras confirmación explícita, sin cuerpo. Solo después de un `200` válido se muestra el resultado y el enlace público `/recetas/{id}`. El catálogo sigue leyendo su propia API. |
| `POST /moderacion/recetas/{id}/rechazar` | Tras confirmación explícita, envía solo `{"motivo":"…"}`. El motivo es obligatorio y admite hasta 1000 caracteres tras quitar espacios extremos. No publica la receta. |

Ambos POST llevan `If-Match` entre comillas, por ejemplo `"3"`, con la
versión del último detalle consultado, no la del listado. Después de
una decisión confirmada se deshabilitan ambas acciones y al volver a la cola
se obtiene una página nueva del servidor. Ante `409`, un fallo de red, un
5xx o una respuesta de éxito inesperada, se vuelve a consultar el detalle:
se conserva el motivo y se requiere una nueva confirmación si aún está
pendiente. No se repite automáticamente ningún POST. Un `404` solo indica
que la receta ya no está disponible para moderación; no revela su estado.

Spring Boot registra el evento en `auditoria_moderacion` dentro de la misma
transacción que la decisión. React no escribe auditorías, no envía actor,
autor, estados ni fechas y no muestra historial. Este flujo de revisión
editorial es independiente de la bandeja de reportes. No se pueden archivar,
restaurar, reenviar o editar recetas ni administrar usuarios desde moderación.

**Validación de extremo a extremo** (solo en un entorno autorizado):

1. Arranca el backend con `dev` y una base de pruebas aislada, y Vite con
   las instrucciones anteriores. Usa cuentas de prueba con roles asignados
   por el equipo del backend, nunca credenciales ni servidores de producción.
2. Con una cuenta `COCINERO`, crea y envía dos borradores completos a revisión.
   Con `USUARIO` o un `COCINERO` sin rol editorial, verifica el acceso denegado.
   Con `MODERADOR` y con `ADMIN`, verifica el acceso, filtros y paginación
   (prepara más de 12 pendientes). Con una cuenta que también sea autora,
   verifica que no aparecen acciones sobre sus propias recetas.
3. Aprueba una receta de otro autor, vuelve a la lista y verifica que ya no
   aparece. Abre su enlace público y comprueba la publicación desde el
   catálogo. Rechaza la otra con un motivo válido: también debe salir de la
   cola, pero no debe aparecer en el catálogo.
4. Abre una misma pendiente en dos sesiones de prueba; decide primero en
   una y confirma después en la otra. Verifica el conflicto y el nuevo GET,
   sin repetición del POST, sin perder el motivo y sin inferir el estado a
   partir de un `404`. Con acceso autorizado a la base de pruebas, comprueba
   que hay un solo evento de auditoría por decisión efectiva.

Contrato: [MODERACION_API.md](../backend/docs/MODERACION_API.md).
`npm test` cubre moderación con HTTP simulado. En Chromium, también con HTTP
simulado, se revisaron cola, detalle, confirmaciones, resultados, reintento y
conflictos a **320, 390, 768 y 1440 px**, sin desplazamiento horizontal.
La verificación transaccional contra Spring Boot y MySQL queda pendiente.

#### Reportes de recetas

En el detalle público, **Reportar receta** lleva al login con retorno seguro
si no hay sesión. Cualquier cuenta autenticada puede reportar, sin `COCINERO`,
salvo la autora de la receta. Solo se reportan recetas visibles. Escribe un
motivo no vacío de hasta 500 caracteres y confirma el envío. Un `409` indica
que ya hay un reporte pendiente de esa cuenta para la receta. Si falla la
conexión, conserva el motivo y no reenvía: el servidor podría haber recibido
el reporte. Tras un descarte o resolución, se puede volver a reportar si la
receta sigue visible; no existe una consulta de reportes propios.

| Endpoint bajo `/api/v1` | Operación |
| --- | --- |
| `POST /recetas/{id}/reportes` | Envía solo `{"motivo":"…"}`; confirma únicamente tras un `201` válido. |
| `GET /moderacion/reportes?estado=ABIERTO&pagina=0&tamano=12` | Bandeja para `MODERADOR` o `ADMIN`. El filtro inicial es Abierto; también se puede consultar En revisión, Resuelto, Descartado o todos. La API pagina y filtra; la interfaz muestra las fechas en UTC. |
| `GET /moderacion/reportes/{id}` | Detalle por ID numérico. Ofrece un enlace a la receta si su detalle público sigue disponible. |
| `POST /moderacion/reportes/{id}/descartar` | Cierra el reporte pendiente sin modificar la receta. |
| `POST /moderacion/reportes/{id}/dar-baja` | Baja lógica de la receta y resolución de todos sus reportes pendientes. No borra favoritos, archivos ni otras relaciones. |

Las decisiones solo se ofrecen para reportes Abiertos o En revisión. Tras
confirmación explícita, el POST no envía cuerpo, justificación ni `If-Match`.
Un `200` válido actualiza el estado con la respuesta del servidor. Ante `409`,
fallo de red, `5xx` o respuesta inesperada, se consulta el detalle antes de
permitir otra decisión, sin repetir el POST. Las escrituras de moderación se
serializan dentro de la sesión aunque se vuelva a abrir el detalle. El backend
autoriza y registra la auditoría. Catálogo, detalle público y Favoritos
reflejan la visibilidad al volver a consultar sus endpoints.

**Para revisar con Aleks:** la antigua demo impedía moderar reportes propios
o sobre recetas propias. El contrato y el backend de reportes no establecen
esas restricciones; React no las deduce a partir del nombre visible del
reportante ni aplica las reglas de revisión editorial a este flujo.

Contrato: [REPORTES_API.md](../backend/docs/REPORTES_API.md).
La prueba de Chromium [`qa/reports.mjs`](qa/reports.mjs) cubre, con HTTP
simulado, reportar, descartar, volver a reportar, dar de baja y comprobar
catálogo, detalle 404 y Favoritos a 320, 390, 768 y 1440 px. En el detalle
público, **Revisar envío** y **Confirmar envío** usan el fondo arcilla del
sitio sin depender del panel de cocinero. La prueba comprueba su visibilidad,
el fondo calculado, el contraste mínimo de 4.5:1 y que el formulario no
desborde. También verifica que no haya POST al validar, volver a editar o
cancelar, y que una doble activación de la confirmación solo produzca un POST.
Desde `frontend/`,
ejecuta `npm run build` y `node qa/reports.mjs` con Chrome instalado y
`PLAYWRIGHT_MODULE` apuntando a `playwright-core/index.mjs`. No usa
credenciales reales ni envía solicitudes a producción. Queda pendiente
verificar las transacciones y la auditoría con Spring Boot y MySQL en un
entorno de pruebas autorizado.

### Panel de administración

Una cuenta con el rol explícito `ADMIN` puede abrir **Panel de administración**
desde Mi perfil o entrar directamente en `/admin`. Si no hay sesión, se pide
iniciarla y se conserva un destino interno permitido; otros roles no dan acceso
al panel. El servidor autoriza cada solicitud por separado.

| Ruta | Qué muestra |
| --- | --- |
| `/admin` | Redirige a `/admin/usuarios`. |
| `/admin/usuarios` | Listado de la API con búsqueda por nombre visible o correo (hasta 100 caracteres), filtros por rol y estado, y páginas de 20. |
| `/admin/usuarios/:id` | ID, nombre visible, correo, estado, fecha de registro UTC y roles de la cuenta. |
| `/admin/catalogos` | Categorías e ingredientes reales de solo lectura, con búsqueda. |
| `/admin/recetas` | Listado real paginado, filtros y baja o restauración con justificación y confirmación. |

El listado vuelve a la primera página al cambiar un filtro, cancela consultas
obsoletas y usa los totales devueltos por el servidor. No hay datos de ejemplo
como respaldo si la API falla.

[`adminUsersService.js`](src/services/adminUsersService.js) usa la sesión
autenticada para consultar `/api/v1/admin/usuarios`. Para cuentas activas, la
interfaz ofrece asignar o retirar **solo COCINERO**, con confirmación explícita.
`PUT` y `DELETE` usan `/{id}/roles/cocinero` sin cuerpo y esperan `204`; no se
envían roles ni justificaciones. No se muestran cambios antes de volver a
consultar el detalle. Si falla esa consulta tras un `204`, se indica que la
operación fue confirmada pero el detalle sigue pendiente. Ante un fallo de
red, respuesta inesperada o `409`, se consulta el estado antes de habilitar
otro cambio y no se repite la escritura automáticamente.

Retirar COCINERO no elimina recetas ni otros roles. Un cambio propio confirmado
o incierto pide iniciar sesión de nuevo para consultar los permisos actuales;
la salida local no revoca sesiones en el servidor. Para comprobar desde la
interfaz el acceso de otra cuenta tras un cambio, inicia sesión de nuevo en
ella: la sesión del frontend carga los roles desde `/auth/me` al entrar.
El detalle también permite gestionar MODERADOR y desactivar o reactivar cuentas
con confirmación. Los cambios efectivos revocan las sesiones afectadas y se
registran en auditoría; no se ofrece la asignación del rol ADMIN.

Contrato: [ADMIN_USUARIOS_API.md](../backend/docs/ADMIN_USUARIOS_API.md).
Las recetas usan el [contrato administrativo](../backend/docs/ADMIN_RECETAS_API.md):
las acciones envían `If-Match` con la versión y vuelven a consultar el listado;
restaurar una publicación la deja pendiente de aprobación. Un fallo no presenta
datos ficticios ni confirma una operación no confirmada por el servidor.
`npm test` cubre el servicio y el flujo de registro, asignación, acceso al
editor y retiro con HTTP simulado. La prueba de Chromium
[`qa/admin-users.mjs`](qa/admin-users.mjs) usa datos ficticios, intercepta todas
las llamadas API y bloquea otros orígenes. Desde `frontend/`, ejecuta
`npm run build` y `node qa/admin-users.mjs` con Chrome instalado y
`PLAYWRIGHT_MODULE` apuntando a `playwright-core/index.mjs`.

### Tradiciones y regiones

- Desde Inicio, pulsa **Tradiciones** en la barra para abrir la introducción.
  **Conocer las regiones** en Inicio y el enlace cultural en el catálogo deben ir
  directamente a la sección de las ocho regiones. Abre también
  `/tradiciones#regiones` en una pestaña nueva.
- Las ocho tarjetas son una guía cultural de `src/data/regions.js`, no una
  clasificación de las recetas publicadas. El enlace de Tradiciones abre el
  catálogo completo; los enlaces antiguos con `?region=…` muestran un aviso.
- A **320, 390, 768 y 1440 px**, comprueba que se muestran las ocho tarjetas,
  en una, una, dos y cuatro columnas respectivamente, sin desplazamiento
  horizontal. Recorre los enlaces con Tab y comprueba que el foco es visible.

La página usa Fraunces e Inter, la paleta del sitio e ilustraciones CSS; la
pantalla de Tradiciones del prototipo no se pudo verificar en Figma.

### Perfil y favoritos

- Usa los enlaces **Mi perfil** y **Favoritos** del pie público.
  Comprueba que **Iniciar sesión** y **Crear una cuenta** abren sus formularios
  sin la cabecera ni el pie públicos.
- En **Mi perfil**, una sesión confirmada muestra exclusivamente los datos
  de `/me`. No hay edición de nombre, contraseña, avatar ni roles.
- Desde **Favoritos** puedes abrir el catálogo público.
  Con sesión iniciada, marca una receta desde **Catálogo** o **Detalle**,
  comprueba que aparece en **Favoritos** y quítala desde allí. Al regresar al
  catálogo, el control debe ofrecer agregarla de nuevo.
- Recarga las rutas nuevas directamente. A **320, 390, 768 y 1440 px**, revisa
  que no haya desplazamiento horizontal y que todos los enlaces tengan foco
  visible al recorrerlos con Tab.

**Figma:** las vistas personales usan el layout público en lugar del panel
de cocinero: no muestran ajustes de cuenta ni una lista
de compras. El directorio de autores ficticio fue retirado.

**Verificado:** enlaces de las nuevas vistas, recarga directa, foco visible
por teclado y ausencia de desplazamiento horizontal a 320, 390, 768 y 1440 px.
También se comprobó que Inicio, Catálogo, Detalle, Tradiciones y las tres rutas
de autenticación siguen abriendo.

#### Integración de favoritos

`favoritesService.js` usa `apiRequest` vía la sesión autenticada para
`GET /api/v1/favoritos` y `POST`/`DELETE /api/v1/favoritos/{recetaId}`; las
mutaciones esperan `204` sin JSON. Catálogo, detalle y favoritos comparten el
estado en memoria de la sesión y revalidan la lista al entrar en esas rutas.
El control evita duplicados mientras se guarda y solo cambia tras el éxito.
Un `401` limpia la sesión local y pide iniciar sesión; un `403` muestra un
problema de autorización sin cerrar la sesión.

El JWT no se almacena en el navegador: **al recargar hay que volver a iniciar
sesión**. Los favoritos persisten en MySQL y reaparecen tras iniciar sesión de
nuevo. Solo se muestran recetas visibles según el servidor (publicadas, no
eliminadas y de autores activos). Si una deja de ser visible, la asociación
se conserva pero no se ofrece desde la lista.

Contrato: [FAVORITOS_API.md](../backend/docs/FAVORITOS_API.md).
`npm test` cubre la integración con `fetch` simulado además de las pruebas
existentes del catálogo, la calculadora y autenticación. La edición del perfil y
la integración de perfiles de autores quedan fuera de este módulo.

### Formularios de autenticación

Las rutas de autenticación usan un layout propio inspirado en los frames 06, 07 y 08
de Figma, sin la cabecera ni el pie públicos. En pantallas estrechas el
panel de marca se compacta y el formulario queda en una columna.

1. **Registro:** `POST /api/v1/auth/registro` crea una cuenta (201) e
   indica cómo iniciar sesión. No devuelve JWT ni inicia sesión. Un 409
   señala correo duplicado; los 400 con errores de campo aparecen en el
   formulario. Se comprueban los topes de 100 y 254 para nombre y correo,
   8–72 caracteres y hasta 72 bytes UTF-8 para contraseña, más composición
   y confirmación. La contraseña se envía sin recortarla ni modificarla.
2. **Login:** `POST /api/v1/auth/login` devuelve un JWT provisional. El
   frontend llama a `GET /api/v1/auth/me` con Bearer antes de mostrar una
   sesión o navegar al perfil (o al destino interno permitido). Los roles
   que muestra son los que devuelve el servidor; son acumulables.
3. **Logout:** `POST /api/v1/auth/logout` recibe el Bearer sin cuerpo. Un
   204 confirma que el servidor revocó **todos** los JWT de la cuenta,
   incluidos los de otros dispositivos. Un 401 borra la sesión local
   inválida. Una respuesta 409 o un fallo de conexión no se reintenta ni
   confirma la revocación: se ofrece salir solo de este navegador.

El JWT se mantiene exclusivamente en memoria. Recargar por completo, cerrar
la pestaña o abrir otra pestaña requiere iniciar sesión otra vez. La sesión
local caduca según `expiraEnSegundos` (1800 por defecto); no hay refresh
tokens. Salir localmente o recargar no equivale a revocar tokens en el
servidor. Moderación de recetas y administración de usuarios usan esa sesión.

`npm test` simula HTTP sin llamar al backend: cubre los estados de los
cuatro endpoints, errores de campo y red, carga de roles, cancelación, expiración,
sesión no restaurada y el envío de credenciales solo donde corresponden.
En Chromium, con HTTP simulado, se revisaron **320, 390, 768 y 1440 px**:
Tab, foco visible, validación local, mensajes de error, botones deshabilitados
durante el envío, pérdida de sesión al recargar y apertura de rutas públicas
y de los tres paneles. Queda por repetir el flujo completo contra Spring Boot
con MySQL y el perfil `dev`.

#### Recuperación y restablecimiento de contraseña

La recuperación está deshabilitada por defecto y requiere configuración SMTP
explícita; el estado y la entrega deben comprobarse en el entorno correspondiente. El frontend implementa el
[contrato del PR #42](../backend/docs/RECUPERACION_CONTRASENA_API.md), pero
las pruebas con HTTP simulado no comprueban el envío ni la entrega de correos
y no demuestran que el flujo completo funcione en producción.

| Ruta | POST público del mismo origen | Cuerpo JSON |
| --- | --- | --- |
| `/recuperar-contrasena` | `/api/v1/auth/recuperar-contrasena` | `{"correo":"persona@ejemplo.invalid"}` |
| `/restablecer-contrasena` | `/api/v1/auth/restablecer-contrasena` | `{"token":"…","contrasena":"…"}` |

- **Solicitud:** exige correo con formato válido y hasta 254 caracteres,
  normalizado como en Java (`strip` y minúsculas). El `200` con el mensaje
  esperado no distingue entre cuentas existentes, inexistentes y desactivadas.
  La entrega depende de la disponibilidad del servicio de correo.
- **Restablecimiento:** reutiliza las reglas de registro: 8–72 unidades
  UTF-16 (la longitud de Java), hasta 72 bytes UTF-8, mayúscula y dígito
  ASCII, y un carácter que no sea letra, número ni espacio según la expresión
  del backend. La confirmación debe coincidir exactamente; no se transmite
  ni se recortan las contraseñas.
- **Enlace:** solo se acepta `#token=…` con exactamente 43 caracteres
  Base64URL y sin parámetros adicionales. El historial elimina el
  fragmento con `replaceState` antes de entregar la ubicación a React
  Router, también en navegaciones posteriores. Las claves aleatorias de 128
  bits no se reinician al recargar y no contienen el token. El token vive
  solo en memoria. Al salir se descarta; si el navegador congela el
  documento en BFCache, también se desmontan el formulario y el resultado
  anterior. Al recargar o regresar por el historial hay que abrir el
  enlace original o solicitar otro, sin repetir el POST.
  El backend decide la validez, el consumo y el vencimiento del token
  (20 minutos desde la emisión, sin contador local).
- **Respuesta:** `429` pide esperar sin dar una hora de desbloqueo. `503`
  informa indisponibilidad temporal y permite intentar manualmente después,
  sin confirmar el envío ni invalidar el enlace. Si no se puede confirmar
  el restablecimiento (red, `500` o respuesta inesperada), se recomienda
  intentar iniciar sesión con la nueva contraseña o solicitar otro enlace.
  No hay reintentos automáticos. Los POST omiten JWT y cookies, no usan caché
  y requieren HTTPS fuera del entorno local de bucle invertido.
- **Sesión:** tras el `200` válido se descartan el token y los campos de
  contraseña. Solo se cierra en este navegador la sesión que estaba activa
  al enviar, si sigue siendo la misma. No se llama a `/logout` ni se inicia
  sesión automáticamente: la cuenta abierta podría ser distinta. El
  backend invalida los JWT de la cuenta restablecida.

Desde `frontend/`, ejecuta `npm test` para las pruebas automatizadas. Para
repetir la verificación en Chromium, ejecuta `npm run build` y
`node qa/password-recovery.mjs` con Chrome instalado y `PLAYWRIGHT_MODULE`
apuntando a `playwright-core/index.mjs`. El script levanta servidores locales,
intercepta toda la API y bloquea peticiones a otros orígenes. Solo usa datos
ficticios; no envía correos ni contacta producción. Comprueba teclado, foco,
contraste y ausencia de desbordamiento a 320, 390, 768 y 1440 px, y repite
el flujo con `StrictMode` en desarrollo. Además de simular `pagehide` y
`pageshow` para probar cada defensa por separado, el script habilita BFCache
en Chromium y comprueba una restauración real: exige eventos del navegador
con `persisted=true` y verifica que se restaure el mismo documento, tanto
desde un formulario con datos como después de un éxito. También comprueba
Atrás y Adelante, enlaces directos, filtros del catálogo y el retorno al
destino exacto después del login. Las respuestas HTTP siguen siendo simuladas
en todas estas comprobaciones.

### Recetario público

`src/services/recipesService.js` reutiliza `apiRequest` y su base `/api/v1`.
Las consultas son `GET` y nunca envían Bearer ni cookies:

| Consulta | Uso |
| --- | --- |
| `/api/v1/recetas` | Hasta tres recetas en Inicio (`tamano=3`) y seis por página en Catálogo (`tamano=6`). |
| `/api/v1/categorias` | Opciones del filtro con IDs numéricos reales; una lista vacía no tiene sustitutos locales. |
| `/api/v1/ingredientes` | Opciones para el editor de cocinero con nombres e IDs reales; una lista vacía no tiene sustitutos locales. |
| `/api/v1/recetas/{id}` | Detalle por ID numérico, con ingredientes y porciones base. |
| `/api/v1/recetas/{id}?porciones=2` | Ingredientes ajustados por el servidor; `porciones` admite enteros de 1 a 100. |

El [contrato del backend](../backend/docs/RECETAS_PUBLICAS_API.md) admite
`titulo` (subcadena de hasta 200 caracteres), `categoria` (ID positivo),
`tipo` (`COMUN` o `TRADICIONAL_OAXAQUENA`), `pagina` (desde 0) y `tamano`
(1 a 50). Introduce un título y pulsa **Enter** o **Buscar recetas**.
Los filtros se combinan y al cambiarlos se vuelve a la primera página.
La URL conserva los filtros y `pagina` desde cero: `?pagina=1` corresponde
a la página 2 de la interfaz. Atrás y Adelante restauran la selección.
Cada página usa `contenido`, `totalElementos` y `totalPaginas` del servidor;
no se pagina en memoria. Inicio usa el orden de la API, no una selección editorial.

En el detalle, **2**, **4** y **6** son accesos rápidos; para otra cantidad,
usa el campo de porciones y pulsa **Ajustar**. Al volver a la base se reutilizan
las cantidades originales. Para cualquier otro valor válido, el frontend
muestra `cantidadAjustada` tal como llega, con coma decimal y sin recalcular,
redondear ni convertir unidades. Muestra «Al gusto» para `AL_GUSTO` y «≈ 0»
si una cantidad positiva se redondeó a cero en el servidor. Al cambiar filtros
o porciones se cancelan las consultas anteriores. Los fallos de ajuste no
ocultan la preparación ni la información general de la receta.

Los enlaces de Inicio y Catálogo usan IDs de MySQL; no se intentan traducir
los antiguos slugs ficticios (`mole-negro`, `tlayuda`, etc.). Un ID inválido
o un 404 muestra «Receta no encontrada». No se imputa región ni duración,
ni se ofrecen filtros por ingredientes o video.

**Portadas:** el DTO de `GET /api/v1/recetas` no incluye multimedia. Inicio,
Catálogo y Favoritos consultan `GET /api/v1/recetas/{id}` para las tarjetas
mostradas, con un máximo de tres detalles simultáneos y sin repetir el mismo
ID en una carga del listado. Al cambiar filtros, página o ruta, se cancelan
los detalles obsoletos. Tanto en tarjetas como en el detalle se usa la
primera referencia `IMAGEN` HTTPS válida por orden, con texto alternativo.
Las fotos de las tarjetas se cargan de forma diferida sin cambiar su altura.
Ante un error del detalle, ausencia de imagen válida o fallo de carga de la
foto se mantiene `DishIllustration`. Tradiciones conserva las ilustraciones
regionales y no consulta recetas. Esto agrega hasta una solicitud por tarjeta
en cada carga: incluir una portada en el DTO del catálogo sería más eficiente.
La preparación se muestra como texto, sin HTML, y puede estar vacía.

Las secciones administrativas de catálogos y recetas consultan la API.
`demoAdminUsers` se conserva solo para pruebas históricas y no
alimenta el panel de usuarios. Los datos ficticios no son un respaldo de la API.
`demoCookRecipes`, `src/data/recipes.js` y `src/utils/servings.js` se
conservan para pruebas históricas y no son datos alternativos si falla la API.

**Verificación:** `npm test` simula `fetch` y comprueba URLs, paginación,
categorías, detalles, porciones, errores, cancelación y ausencia de Bearer.
Pasaron las 85 pruebas, `npm run build`, `npm run lint` y `git diff --check`.
En Chromium, con HTTP simulado a 320, 390, 768 y 1440 px, se revisaron
Inicio, filtros y navegación por historial, detalle y calculadora, vacíos,
errores y reintentos, foco visible, registro, login, perfil y acceso a los
tres paneles. No se observó desplazamiento horizontal en esas vistas.
La verificación de extremo a extremo contra un Spring Boot `dev` con MySQL
y recetas publicadas queda pendiente. Conviene repetir con un catálogo vacío
y otro de más de seis recetas, categorías múltiples, 404 y cantidades ajustadas.

## Comprobaciones locales

```sh
npm test         # Incluye autenticación, reportes, moderación y administración de usuarios con HTTP simulado
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
git diff --check
```

La comprobación de experiencia en Chromium usa
[`qa/recipe-experience.mjs`](qa/recipe-experience.mjs). Requiere Chrome,
`playwright-core` (puede instalarse fuera del proyecto) y FFmpeg con `libx264`
y `libvpx`. Configura `PLAYWRIGHT_MODULE` con la ruta absoluta a
`playwright-core/index.mjs` y, si `ffmpeg` no está en `PATH`,
`FFMPEG_EXECUTABLE` con su ruta. Inicia
`npm run dev -- --host 127.0.0.1 --port 4177 --strictPort` y, en otra terminal,
ejecuta `node qa/recipe-experience.mjs`.
El script intercepta la API y multimedia y bloquea los demás orígenes;
usa credenciales ficticias y no escribe en producción. Comprueba 320, 390,
768 y 1440 px, incluidos foco, navegación, reenvío y reproducción MP4/WebM.

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/1`.
