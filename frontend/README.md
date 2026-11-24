# Sabores de Oaxaca · Frontend

Aplicación en JavaScript con React, Vite y React Router. Inicio, Catálogo y el
detalle toman como referencia los frames «01 · Inicio público»,
«02 · Explorar recetas» y «04 · Detalle de receta» (2, 4 y 6 personas) de Figma.
Las composiciones de tablet y móvil son adaptaciones del escritorio.
Las ilustraciones se recrean con CSS y las fuentes Fraunces e Inter se cargan
desde Google Fonts.
Inicio, el catálogo y el detalle consultan la API pública. El registro, el
inicio de sesión, el perfil, los favoritos y el panel del cocinero también
requieren el backend. Moderación, reportes y administración siguen siendo
demostraciones con datos locales.

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
| `POST /mis-recetas/{id}/enviar-revision` | Solo borrador activo y completo. Si hay cambios locales, los guarda primero. Envía `If-Match: "versión"` (p. ej. `"0"`), sin cuerpo. El `200` devuelve la nueva versión y `PENDIENTE`, no `PUBLICADA`. |
| `DELETE /mis-recetas/{id}` | Confirma explícitamente y envía `If-Match` entre comillas, sin cuerpo. Tras `204` vuelve a consultar el detalle. La baja no cambia el estado editorial y no se puede restaurar desde aquí. |
| `GET /categorias` | Carga el catálogo con el servicio público existente, sin Bearer. |

Contrato: [RECETAS_COCINERO_API.md](../backend/docs/RECETAS_COCINERO_API.md).
El borrador permite guardar sin categorías, ingredientes ni multimedia.
Para revisión se requiere al menos una categoría y un ingrediente. Multimedia
solo admite referencias HTTPS (`IMAGEN` o `VIDEO`), sin subida de archivos.
El editor conserva los IDs, nombres y cantidades base del detalle y vuelve
a enviar las asociaciones completas al guardar.

- **Ingredientes:** no existe un endpoint de catálogo documentado. Hasta
  que haya un contrato oficial, introduce el ID numérico de un ingrediente
  existente proporcionado por **Aleks**. El servidor valida si existe. No
  hay IDs predeterminados ni se consulta `/ingredientes`.
- **Aviso para Aleks — recetas rechazadas:** editar no cambia `RECHAZADA`
  a `BORRADOR` y el contrato actual no permite reenviarlas. No se simula una
  transición ni se habilita un botón de reenvío.
- **Conflictos (`409`):** se conservan los cambios en el editor. Consulta el
  detalle del servidor, compara ambas versiones y elige qué datos usar.
  Adoptar la versión no escribe ni reintenta; si aún se puede editar,
  guarda de nuevo explícitamente. Salir de la pantalla, cerrar sesión o
  recargar descarta los cambios que no se hayan guardado.
- **Diseño:** se mantiene la composición de los frames 09–12 de Figma:
  barra lateral, tarjetas de resumen, tabla, formulario y vista previa.
  En móvil la navegación pasa arriba y la tabla se apila.

**Verificación:** `npm test` simula `fetch` para comprobar listado, detalle,
creación, edición, baja, revisión, versiones, roles, validación, errores,
cancelación y bloqueo de envíos duplicados. En Chromium con HTTP simulado
se probaron listado, detalle, edición, creación y comparación `409` a
320, 390, 768 y 1440 px sin desplazamiento horizontal; también el retorno
de login, el modo de solo lectura, el recetario y agregar/quitar favoritos.
Queda pendiente el flujo de
extremo a extremo contra Spring Boot + MySQL con cuentas autorizadas:
probar un `COCINERO`, una cuenta sin ese rol (o `ADMIN` sin `COCINERO`),
IDs de categorías e ingredientes provistos en ese entorno, paginación,
concurrencia real y consistencia de la baja con el catálogo público.

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
servidor. Moderación y administración siguen siendo demostraciones sin
protección ni operaciones de negocio reales.

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
Las cuatro consultas son `GET` y nunca envían Bearer ni cookies:

| Consulta | Uso |
| --- | --- |
| `/api/v1/recetas` | Hasta tres recetas en Inicio (`tamano=3`) y seis por página en Catálogo (`tamano=6`). |
| `/api/v1/categorias` | Opciones del filtro con IDs numéricos reales; una lista vacía no tiene sustitutos locales. |
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

Moderación y administración conservan `demoModerationRecipes`,
`demoModerationReports`, `demoAdminUsers`, `demoAdminRecipes` y
`demoAdminCatalogs`. `demoAuthors` sigue alimentando el directorio ficticio.
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
npm test         # Autenticación, favoritos, recetario y panel de cocinero con HTTP simulado
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
```

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/1`.
