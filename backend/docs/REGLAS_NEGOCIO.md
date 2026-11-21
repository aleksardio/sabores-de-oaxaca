# Reglas de negocio propuestas

Estas reglas son decisiones propuestas para aprobación; la seguridad debe aplicarlas en servidor, no confiar en el cliente. Las restricciones físicas y columnas están en [MODELO_DATOS.md](MODELO_DATOS.md).

## Identidad, permisos y propiedad

- Visitante: consulta únicamente recetas `PUBLICADA` no eliminadas cuyo autor esté activo. Una cuenta activa tiene `eliminado_en` nulo; todas las rutas autenticadas verifican esa condición.
- Una cuenta nueva recibe `USUARIO`. `ADMIN` asigna y retira roles; nadie puede otorgárselos por registro o modificación de perfil. Los roles son acumulables; los permisos son la unión de los roles asignados, sin jerarquía implícita.
- `USUARIO` gestiona su propio perfil, contraseña, favoritos y reportes. `COCINERO` puede crear recetas y gestionar solo las propias según estado. El autor se fija en el servidor al crear. La propiedad no implica moderar ni asignar roles. `ADMIN` administra cuentas, roles y catálogos; también tiene permisos de moderación. `MODERADOR` modera y revisa reportes. Ni ADMIN ni MODERADOR alteran silenciosamente el contenido de otros: sus acciones editoriales son las de moderación auditadas.
- `COCINERO` puede consultar sus recetas incluso si no son públicas, excepto cuando su propia cuenta está desactivada. Tras perder el rol no puede crear ni editar recetas; la lectura de sus propias recetas se conserva. Las cuentas desactivadas no pueden autenticarse, publicar ni operar. Un moderador no puede aprobar, rechazar o archivar sus propias recetas ni resolver sus propios reportes; debe intervenir otro moderador o administrador.
- Permisos y estado activo se comprueban en cada solicitud. Los JWT, si se adoptan, incluirán la `version_tokens` actual; comparar con la base de datos o caché coherente en cada solicitud, además de verificar firma, algoritmo permitido, emisor, audiencia y expiración. Cerrar sesión incrementa atómicamente la versión y cierra **todas** las sesiones, no solo el dispositivo actual. Una caché obsoleta impide la revocación inmediata. No se implementa revocación individual por dispositivo en esta etapa; requeriría otro diseño.
- Usar hash adaptativo de contraseñas. Recuperación: token aleatorio enviado por canal seguro, persistir solo SHA-256; vencimiento corto, uso atómico único, respuesta pública indistinguible para correo existente o no, y limitación de frecuencia. Al cambiar o restablecer contraseña se incrementa `version_tokens`; al desactivar cuenta, además se invalidan recuperaciones pendientes. Proteger URL, registros y transporte contra exposición del token.

## Flujo editorial

Al crear, una receta comienza en `BORRADOR`. Envío y publicación exigen título, descripción, preparación, porciones positivas, al menos un ingrediente y una categoría; multimedia es opcional. En cualquier estado se mantiene la integridad de campos NN del modelo.

| Origen | Destino | Quién y condición |
|---|---|---|
| BORRADOR | PENDIENTE | COCINERO propietario envía contenido completo |
| PUBLICADA | BORRADOR | COCINERO propietario retira su receta para editar; deja de ser pública inmediatamente |
| RECHAZADA | BORRADOR | COCINERO propietario reabre y corrige |
| PENDIENTE | PUBLICADA | MODERADOR o ADMIN distinto del autor aprueba; fija `publicado_en` en primera publicación |
| PENDIENTE | RECHAZADA | MODERADOR o ADMIN distinto del autor rechaza; justificación obligatoria en auditoría |
| PUBLICADA | ARCHIVADA | MODERADOR o ADMIN distinto del autor, con justificación en auditoría |
| ARCHIVADA | PENDIENTE | MODERADOR o ADMIN distinto del autor restaura para nueva revisión, con auditoría |

El propietario COCINERO solo edita contenido de `BORRADOR` o `RECHAZADA`; puede retirar su `PUBLICADA` a `BORRADOR`, modificarla, enviarla a `PENDIENTE` y obtener nueva aprobación de otro MODERADOR o ADMIN. No se permite editar contenido en `PENDIENTE`, `PUBLICADA` ni `ARCHIVADA`. Las transiciones editoriales ordinarias requieren receta no eliminada y autor activo; en particular, no se usa el retiro para eludir un bloqueo de moderación. `publicado_en` conserva la primera publicación y `actualizado_en` se actualiza en cada cambio de contenido, estado o baja/restauración lógica.

Transiciones editoriales de moderación y cambios de reportes se escriben con su auditoría en una misma transacción. Validar estado anterior y baja mediante bloqueo o actualización condicional para evitar operaciones concurrentes. El retiro y demás cambios editoriales ordinarios del autor no se registran en auditoría de moderación; excepción: la restauración de baja de una receta `PUBLICADA` genera `RESTAURAR_BAJA`, con actor autor o ADMIN y estados anterior/nuevo. Las operaciones administrativas descritas más abajo requieren además auditoría administrativa.

## Favoritos y reportes

- Una cuenta activa puede marcar una receta visible públicamente como favorita; la PK compuesta evita duplicados incluso con peticiones concurrentes. Quitar un favorito elimina esa asociación; repetir la operación es idempotente desde la API. Al listar favoritos se muestran solo recetas visibles, sin destruir asociaciones ocultas.
- Una cuenta activa puede reportar una receta visible, incluso la propia; la aplicación debe limitar abuso. Estados del reporte: `ABIERTO → EN_REVISION → RESUELTO` o `ABIERTO → EN_REVISION → DESCARTADO`. Un moderador o administrador distinto del reportante realiza y audita cada cambio; al resolver o descartar registra justificación y fecha. Los reportes existentes pueden revisarse aunque la receta o el reportante estén desactivados. Resolver un reporte no cambia automáticamente el estado de la receta: cualquier acción editorial es explícita y auditada por separado.
- La auditoría de moderación conserva actor, receta, reporte si aplica, acción, estados anterior/nuevo pertinentes, detalle y fecha. Incluye excepcionalmente `RESTAURAR_BAJA` por el autor o ADMIN. No se edita ni elimina mediante funciones ordinarias. Acceso restringido a moderación/administración; no es un historial completo de contenido ni sustituye auditoría de seguridad.

## Porciones e ingredientes

Para `porciones_solicitadas` entero positivo, cada cantidad numérica de respuesta se calcula con aritmética decimal:

`cantidad_escalada = cantidad_base × porciones_solicitadas / porciones_base`.

No se escriben los valores calculados ni se modifican las cantidades originales. Calcular con precisión suficiente y redondear solo el resultado final a tres decimales con HALF_UP para presentación; valores positivos menores de 0.0005 pueden mostrarse como 0.000, por lo que la interfaz debe indicar la aproximación. Comprobar límites de solicitud y evitar desbordamientos antes de operar; límites concretos por definir. El catálogo es `G`, `KG`, `ML`, `L`, `PIEZA`, `CUCHARADA`, `CUCHARADITA`, `TAZA` y `AL_GUSTO`. Las unidades numéricas requieren cantidad positiva; `AL_GUSTO` requiere cantidad NULL, se devuelve sin escalar y admite nota opcional. Nunca convertir automáticamente ni sumar unidades diferentes; la unidad de salida es exactamente la almacenada. Ordenar por `orden` único dentro de la receta.

## Baja lógica y visibilidad

- El autor COCINERO puede dar de baja una receta propia en cualquier estado; también ADMIN puede hacerlo. Se fija `recetas.eliminado_en`, sin alterar `estado` ni borrar asociaciones, multimedia, favoritos, reportes o auditoría. La baja administrativa exige detalle y `BAJA_RECETA` en auditoría administrativa dentro de la misma transacción. La baja del autor no se registra en estas auditorías.
- El autor COCINERO o ADMIN puede restaurar una receta de baja quitando `eliminado_en`. Si estaba `PUBLICADA`, cambia simultáneamente a `PENDIENTE`, permanece oculta y requiere aprobación de un MODERADOR o ADMIN distinto del autor; `RESTAURAR_BAJA` registra el cambio editorial. Si estaba en otro estado, lo conserva: en particular, `ARCHIVADA` sigue bloqueada y solo un moderador o ADMIN distinto del autor puede llevarla a `PENDIENTE` mediante `RESTAURAR`. Una receta `RECHAZADA` sigue rechazada. Restaurar no elude las reglas ni permite edición de estados bloqueados. Toda restauración administrativa genera además `RESTAURAR_RECETA` en auditoría administrativa; las escrituras son atómicas. El autor debe estar activo para restaurar por sí mismo; ADMIN puede restaurar una receta de autor inactivo, pero no será pública mientras el autor siga inactivo.
- ADMIN desactiva cuentas fijando `usuarios.eliminado_en`, incrementando `version_tokens` e invalidando recuperaciones pendientes en una transacción junto con `DESACTIVAR_CUENTA`. No se eliminan recetas ni asociaciones: las recetas de autor inactivo no son públicas aunque sigan `PUBLICADA`; favoritos del usuario quedan ocultos y reportes/auditoría siguen disponibles a moderación. Al reactivar la cuenta se limpia la fecha y registra `REACTIVAR_CUENTA`, sin restaurar sesiones; recetas que sigan `PUBLICADA` y no estén eliminadas y favoritos vuelven a ser visibles si cumplen las demás condiciones. No se alteran estados `ARCHIVADA` ni otras restricciones de moderación. El correo permanece reservado. Política de privacidad/retención pendiente.
- La despublicación, archivo o baja oculta la receta del catálogo y de listas públicas de favoritos, pero retiene sus relaciones. Reportes y auditoría nunca se borran automáticamente. No hay cascadas físicas; la eliminación legal definitiva requiere procedimiento explícito, anonimización compatible con las FK y plazos aprobados.

## Auditoría administrativa

ADMIN registra de forma atómica `DESACTIVAR_CUENTA`, `REACTIVAR_CUENTA`, `BAJA_RECETA`, `RESTAURAR_RECETA`, `ASIGNAR_ROL` y `RETIRAR_ROL` al efectuar la operación. Se registra actor, acción, FK al usuario o receta afectada, rol cuando corresponda, fecha y detalle obligatorio; no se guardan contraseñas, hashes, tokens ni otros datos sensibles. Solo se registran cambios efectivos, no intentos fallidos ni operaciones idempotentes sin cambio. El mecanismo no reemplaza una auditoría de seguridad de intentos. Las FK conservan integridad de actor y recursos; la aplicación verifica autorización y ejecuta modificación y registro en una transacción. Las políticas de acceso, retención y eliminación legal requieren aprobación.

## Búsqueda y paginación

El catálogo público filtra estado, bajas de receta y autor; admite título, categoría y autor. El filtro de estado arbitrario es de moderación/administración; un autor puede filtrar sus propias recetas. Paginar con límite máximo y orden estable con ID de desempate; validar planes de ejecución con datos realistas. Evitar exponer datos de cuentas desactivadas mediante búsquedas o relaciones.
