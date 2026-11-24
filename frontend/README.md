# Sabores de Oaxaca · Frontend

Aplicación en JavaScript con React, Vite y React Router. Inicio, Catálogo y el
detalle toman como referencia los frames «01 · Inicio público»,
«02 · Explorar recetas» y «04 · Detalle de receta» (2, 4 y 6 personas) de Figma.
Las composiciones de tablet y móvil son adaptaciones del escritorio.
Las ilustraciones se recrean con CSS y las fuentes Fraunces e Inter se cargan
desde Google Fonts.
Inicio, el catálogo y el detalle consultan la API pública. El registro, el
inicio de sesión, el perfil, los favoritos, el panel del cocinero y la
moderación de recetas también requieren el backend. Reportes y administración
siguen siendo demostraciones con datos locales.

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
| `/autores` | Directorio de perfiles ficticios, marcados como ejemplos. |
| `/autores/ejemplo` y `/autores/ejemplo-2` | Perfil público de demostración, aviso sobre las recetas asociadas y enlace al catálogo. |
| `/autores/no-existe` | «Autor no encontrado» y enlace al directorio. |
| `/favoritos` | Favoritos personales de la API; carga, vacío, reintento y eliminación. Para visitantes, enlace a login con retorno y al catálogo. |
| `/login` | Acceso con correo y contraseña, mostrar u ocultar contraseña y enlaces a alta y recuperación. |
| `/registro` | Alta con nombre visible, correo, contraseña y confirmación. |
| `/recuperar-contrasena` | Aviso de función no disponible y enlace de regreso al login; no se envía correo. |
| `/no-existe` | La página de ruta desconocida y el enlace al inicio. |

Prueba también recargar directamente un detalle y navegar con una ventana
estrecha: el menú debe ajustarse y las tarjetas deben reorganizarse.

### Panel del cocinero

**Mis recetas** está en el perfil y en el pie público. **Compartir receta**,
en la barra de navegación, abre el formulario solo con `COCINERO`.
`/cocinero` lleva a `/cocinero/recetas`. Sin sesión, se pide iniciar sesión
con retorno a un destino interno permitido. Cualquier cuenta autenticada puede
consultar sus propias recetas. `ADMIN` no implica `COCINERO`: sin el rol de
cocinero solo se permite lectura. Spring Boot decide el acceso definitivo.
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
| `GET /categorias` | Carga el catálogo con el servicio público existente, sin Bearer. |
| `GET /ingredientes` | Carga el catálogo público sin JWT como un arreglo de `{id, nombre}` en el orden del servidor. |

Contrato: [RECETAS_COCINERO_API.md](../backend/docs/RECETAS_COCINERO_API.md).
El borrador permite guardar sin categorías, ingredientes ni multimedia.
Para revisión se requiere al menos una categoría y un ingrediente. Multimedia
solo admite referencias HTTPS (`IMAGEN` o `VIDEO`), sin subida de archivos.
El editor conserva los IDs, nombres y cantidades base del detalle y vuelve
a enviar las asociaciones completas al guardar.

- **Ingredientes:** el selector reemplaza el campo manual: muestra nombres
  de `GET /api/v1/ingredientes` y usa los IDs reales. Impide duplicados
  y conserva cantidad, unidad, orden y nota al sustituir un ingrediente.
  **Buscar ingrediente por nombre** filtra de inmediato los selectores de
  todas las filas, sin nuevas solicitudes HTTP. No distingue mayúsculas ni
  acentos: `maiz` encuentra `Maíz` y `Masa de maíz` si están en el catálogo.
  Aunque no coincidan, los ingredientes seleccionados siguen visibles.
  Si no hay coincidencias, se muestra un aviso; borra la búsqueda para ver
  todas las opciones y usa Tab para pasar del campo a los selectores.
  La vista previa muestra el nombre; el JSON envía `ingredienteId`, no
  el nombre. El editor indica carga, catálogo vacío, error de conexión o
  respuesta inesperada. Puedes reintentar sin perder datos ni bloquear el
  resto del formulario. Si el catálogo no incluye un ingrediente existente,
  conserva su ID y nombre, lo marca como no disponible y permite quitarlo
  o sustituirlo. El servidor valida definitivamente las referencias.
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
| `GET /moderacion/recetas/{id}` | Detalle pendiente de solo lectura, incluida la versión vigente. Muestra cantidades base sin recalcular y referencias multimedia sin incrustar videos ni HTML. |
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
autor, estados ni fechas y no muestra historial. Reportes conserva vistas
de demostración separadas, sin escrituras ni enlaces a recetas reales. No
se pueden archivar, restaurar, reenviar o editar recetas ni administrar
usuarios desde moderación. El panel de administración sigue siendo una demo.

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
no son las del sitio público ni las de los otros paneles. Las ocho
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

### Perfil, autores y favoritos

- Usa los enlaces **Mi perfil**, **Autores** y **Favoritos** del pie público.
  Comprueba que **Iniciar sesión** y **Crear una cuenta** abren sus formularios
  sin la cabecera ni el pie públicos.
- En **Mi perfil**, una sesión confirmada muestra exclusivamente los datos
  de `/me`. No hay edición de nombre, contraseña, avatar ni roles.
- Abre los dos perfiles desde el directorio y prueba también un identificador
  desconocido. Los autores ficticios viven en `src/data/demoAuthors.js`;
  no están relacionados con las recetas ni los autores de la API.
- Desde cada autor y desde **Favoritos** puedes abrir el catálogo público.
  Con sesión iniciada, marca una receta desde **Catálogo** o **Detalle**,
  comprueba que aparece en **Favoritos** y quítala desde allí. Al regresar al
  catálogo, el control debe ofrecer agregarla de nuevo.
- Recarga las rutas nuevas directamente. A **320, 390, 768 y 1440 px**, revisa
  que no haya desplazamiento horizontal, que el directorio se reorganice y
  que todos los enlaces tengan foco visible al recorrerlos con Tab.

**Figma:** se revisaron los frames «05 · Perfil público del autor»,
«13 · Cocinero · Favoritos y compras» y «14 · Cocinero · Mi perfil». El perfil
público conserva la cabecera con iniciales y texto, sin métricas ni recetas
atribuidas. Las vistas personales usan el layout público en lugar del panel
de cocinero: no muestran ajustes de cuenta ni una lista
de compras. El directorio de autores es una vista nueva.

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

Las tres rutas usan un layout propio inspirado en los frames 06, 07 y 08
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
servidor. Moderación de recetas usa esa sesión; administración sigue siendo
una demostración sin operaciones reales.

`npm test` simula HTTP sin llamar al backend: cubre los estados de los
cuatro endpoints, errores de campo y red, carga de roles, cancelación, expiración,
sesión no restaurada y el envío de credenciales solo donde corresponden.
En Chromium, con HTTP simulado, se revisaron **320, 390, 768 y 1440 px**:
Tab, foco visible, validación local, mensajes de error, botones deshabilitados
durante el envío, pérdida de sesión al recargar y apertura de rutas públicas
y de los tres paneles. Queda por repetir el flujo completo contra Spring Boot
con MySQL y el perfil `dev`.

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
ni se ofrecen filtros por ingredientes o video. El listado no incluye fotos.
En el detalle se usa la primera imagen HTTPS utilizable, con texto alternativo.
Sin imagen (URL ausente, `*.invalid`, video o carga fallida) se muestra
`DishIllustration`. No se reproducen videos. La preparación se muestra como
texto, sin HTML, y puede estar vacía.

Reportes y administración conservan datos de demostración en
`demoModerationRecipes`, `demoModerationReports`, `demoAdminUsers`,
`demoAdminRecipes` y `demoAdminCatalogs`. No son un respaldo de la cola real.
`demoAuthors` sigue alimentando el directorio ficticio.
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
npm test         # Autenticación, favoritos, recetario, cocinero y moderación con HTTP simulado
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
```

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/1`.
