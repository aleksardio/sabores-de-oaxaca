# Modelo de datos propuesto

Documento de diseño, no esquema ejecutado. Destino: MySQL 8.0.16 o superior, InnoDB, `utf8mb4` y colación `utf8mb4_0900_ai_ci` por defecto. Las comparaciones de texto con esa colación ignoran mayúsculas y acentos: por ejemplo, dos nombres que solo difieren por acento se consideran duplicados. Los identificadores opacos y hashes usan `BINARY`/colación binaria; nunca se comparan con esa colación lingüística. La política de UTC se aplica en la conexión y aplicación; todos los `DATETIME(6)` representan UTC, sin conversión automática de zona horaria.

## Convenciones

- `PK`: clave primaria; `FK`: foránea; `NN`: no nulo; `UQ`: único. Los campos no señalados como NN admiten NULL. IDs: `BIGINT UNSIGNED` autoincremental cuando se indica. Fechas de creación NN y actualizaciones NN, asignadas por la aplicación; `eliminado_en` NULL significa activo, fecha significa baja lógica. `DATETIME` no tiene zona horaria propia.
- Las FK son `ON DELETE RESTRICT ON UPDATE RESTRICT`, incluidas las tablas de unión. No se prevén eliminaciones físicas de usuarios o recetas en la operación ordinaria. La depuración excepcional y la anonimización requieren un procedimiento aprobado; no se realizan por cascada.
- Los dominios enumerados se guardan como `VARCHAR` con `CHECK`, colación sensible a mayúsculas y acentos `utf8mb4_0900_as_cs`, y se validan también en aplicación. Los `CHECK` son efectivos a partir de MySQL 8.0.16; fijar esa versión mínima en despliegue. Las condiciones sobre campos anulables deben usar comprobaciones explícitas de NULL, pues MySQL acepta un CHECK cuyo resultado sea UNKNOWN. A menos que se indique, las cadenas NN no deben quedar vacías ni ser solo espacios: validación en aplicación; los límites de longitud se aplican en ambas capas.
- Los `UNIQUE` y PK son índices. Las FK sin índice inicial adecuado deben tener uno explícito o generado por MySQL; los índices de consulta se indican abajo. Los índices compuestos no sustituyen los índices por la segunda columna de una relación N:M.

## Identidad y acceso

### usuarios

| Columna | Tipo | Restricciones / propósito |
|---|---|---|
| id | BIGINT UNSIGNED | PK, autoincremental |
| correo | VARCHAR(254) | NN, UQ; correo normalizado por aplicación (espacios y minúsculas) |
| nombre_visible | VARCHAR(100) | NN |
| contrasena_hash | VARCHAR(255) | NN; hash adaptativo con algoritmo y parámetros, nunca contraseña ni cifrado reversible |
| biografia | VARCHAR(1000) | opcional |
| avatar_url | VARCHAR(2048) | opcional; referencia, no archivo |
| version_tokens | BIGINT UNSIGNED | NN, inicial 0; invalidación global de credenciales |
| creado_en, actualizado_en | DATETIME(6) | NN |
| eliminado_en | DATETIME(6) | baja lógica |

La unicidad del correo se conserva aun tras la baja: una cuenta desactivada no libera su identidad. Validación de correo, URLs, normalización y datos de perfil corresponden a la aplicación. El hash se genera con Argon2id o BCrypt configurado; parámetros y proveedor se decidirán antes de implementar.

### roles

`id BIGINT UNSIGNED` PK autoincremental; `codigo VARCHAR(20)` NN UQ con CHECK en `ADMIN`, `MODERADOR`, `COCINERO`, `USUARIO`; `descripcion VARCHAR(255)` NN. El rol no se deduce del nombre ni de la propiedad de una receta.

### usuarios_roles

`usuario_id BIGINT UNSIGNED` NN FK → usuarios.id; `rol_id BIGINT UNSIGNED` NN FK → roles.id; `asignado_en DATETIME(6)` NN. PK compuesta `(usuario_id, rol_id)`; índice `(rol_id, usuario_id)`. Una cuenta puede tener varios roles y un rol corresponder a varias cuentas.

### recuperaciones_contrasena

`id BIGINT UNSIGNED` PK autoincremental; `usuario_id BIGINT UNSIGNED` NN FK → usuarios.id; `token_hash BINARY(32)` NN UQ (SHA-256 de token aleatorio de alta entropía, no el token en claro); `creado_en DATETIME(6)` NN; `expira_en DATETIME(6)` NN; `usado_en DATETIME(6)` NULL; `invalidado_en DATETIME(6)` NULL. CHECK `expira_en > creado_en`; índice `(usuario_id, expira_en)`. Consumo atómico de un solo uso y comprobación de expiración en aplicación. Al restablecer, invalidar las demás recuperaciones pendientes e incrementar `version_tokens` en la misma transacción. Limpieza periódica de filas expiradas o usadas, con retención a aprobar.

## Recetas y catálogos

### recetas

| Columna | Tipo | Restricciones / propósito |
|---|---|---|
| id | BIGINT UNSIGNED | PK autoincremental |
| autor_id | BIGINT UNSIGNED | NN FK → usuarios.id |
| titulo | VARCHAR(200) | NN; no necesariamente único |
| descripcion | TEXT | NN |
| preparacion | MEDIUMTEXT | NN; instrucciones ordenadas como texto, no se modelan pasos individuales aún |
| tipo | VARCHAR(30) | NN, CHECK `TRADICIONAL_OAXAQUENA` o `COMUN` |
| estado | VARCHAR(20) | NN, CHECK `BORRADOR`, `PENDIENTE`, `PUBLICADA`, `RECHAZADA`, `ARCHIVADA` |
| porciones_base | INT UNSIGNED | NN, CHECK > 0 |
| creado_en, actualizado_en | DATETIME(6) | NN |
| publicado_en | DATETIME(6) | NULL hasta primera publicación; no es indicador exclusivo del estado actual |
| eliminado_en | DATETIME(6) | baja lógica independiente del estado |

Índices: `(estado, eliminado_en, publicado_en, id)`, `(autor_id, estado, eliminado_en, id)` y `(titulo, id)`. Para publicar es obligatorio contar con al menos un ingrediente y una categoría; esa regla entre tablas se valida transaccionalmente en aplicación. Filtrar por título con prefijo puede usar el índice; búsquedas por subcadena no garantizan uso de B-tree. Evaluar FULLTEXT y planes reales después, sin prometer búsquedas eficientes por cualquier fragmento. Publicación y eliminación no son sinónimos; ver reglas de negocio.

### ingredientes

`id BIGINT UNSIGNED` PK autoincremental; `nombre VARCHAR(150)` NN UQ; `creado_en DATETIME(6)` NN. Catálogo compartido: se normalizan espacios y se usa la colación general para detectar nombres equivalentes; no se fusionan automáticamente sinónimos. La información de cantidad y unidad no pertenece al catálogo.

### recetas_ingredientes

`receta_id BIGINT UNSIGNED` NN FK → recetas.id; `ingrediente_id BIGINT UNSIGNED` NN FK → ingredientes.id; `cantidad DECIMAL(12,3)` NULL; `unidad VARCHAR(30)` NN; `orden INT UNSIGNED` NN CHECK > 0; `nota VARCHAR(255)` NULL. PK `(receta_id, ingrediente_id)`; UQ `(receta_id, orden)`; índice `(ingrediente_id, receta_id)`. La unidad se almacena en esta asociación; catálogo inicial cerrado mediante CHECK: `G`, `KG`, `ML`, `L`, `PIEZA`, `CUCHARADA`, `CUCHARADITA`, `TAZA`, `AL_GUSTO`.

CHECK adicional, expresado como regla lógica: `(unidad = AL_GUSTO Y cantidad ES NULL) O (unidad pertenece al catálogo salvo AL_GUSTO Y cantidad NO ES NULL Y cantidad > 0)`. Ambas ramas verifican explícitamente la nulidad y la unidad es NN, evitando que UNKNOWN permita una cantidad numérica NULL. `AL_GUSTO` no se escala y su nota es opcional; las unidades numéricas sí se escalan, sin conversión automática. El orden por `orden` es estable y único por receta. Si se necesita ingrediente repetido con cantidades o preparaciones distintas, revisar esta PK antes de migrar; actualmente debe consolidarse o expresarse en la nota.

### categorias y recetas_categorias

`categorias`: `id BIGINT UNSIGNED` PK autoincremental; `nombre VARCHAR(100)` NN UQ; `descripcion VARCHAR(255)` NULL. `recetas_categorias`: `receta_id BIGINT UNSIGNED` NN FK → recetas.id; `categoria_id BIGINT UNSIGNED` NN FK → categorias.id; PK `(receta_id, categoria_id)` e índice `(categoria_id, receta_id)`. El tipo tradicional/común es independiente de las categorías.

### recetas_multimedia

`id BIGINT UNSIGNED` PK autoincremental; `receta_id BIGINT UNSIGNED` NN FK → recetas.id; `tipo VARCHAR(10)` NN CHECK `IMAGEN` o `VIDEO`; `url VARCHAR(2048)` NN; `texto_alternativo VARCHAR(255)` NULL; `orden INT UNSIGNED` NN CHECK > 0; `creado_en DATETIME(6)` NN. UQ `(receta_id, orden)`. No almacenar binarios; la aplicación valida esquema HTTPS, proveedor, permisos y tipo real del recurso. Borrar o desactivar referencias no elimina archivos remotos automáticamente; decidir el ciclo de vida del almacenamiento antes de implementarlo.

## Interacción y moderación

### favoritos

`usuario_id BIGINT UNSIGNED` NN FK → usuarios.id; `receta_id BIGINT UNSIGNED` NN FK → recetas.id; `creado_en DATETIME(6)` NN. PK `(usuario_id, receta_id)` evita duplicados; índice `(receta_id, usuario_id)` para consultas inversas. La fila se puede quitar físicamente al retirar voluntariamente un favorito; las bajas lógicas no la borran.

### reportes

`id BIGINT UNSIGNED` PK autoincremental; `receta_id BIGINT UNSIGNED` NN FK → recetas.id; `reportante_id BIGINT UNSIGNED` NN FK → usuarios.id; `motivo VARCHAR(500)` NN; `estado VARCHAR(20)` NN CHECK `ABIERTO`, `EN_REVISION`, `RESUELTO`, `DESCARTADO`; `creado_en, actualizado_en DATETIME(6)` NN; `resuelto_en DATETIME(6)` NULL. CHECK: estados finales requieren `resuelto_en` no nulo y estados activos lo requieren nulo. Índices `(estado, creado_en, id)`, `(receta_id, creado_en, id)` y `(reportante_id, creado_en, id)`. Se permiten reportes repetidos, incluidos varios del mismo usuario, para preservar eventos; abuso y limitación de frecuencia corresponden a aplicación. El responsable y el resultado de la revisión se registran en auditoría, no en columnas duplicadas.

### auditoria_moderacion

`id BIGINT UNSIGNED` PK autoincremental; `actor_id BIGINT UNSIGNED` NN FK → usuarios.id; `receta_id BIGINT UNSIGNED` NN FK → recetas.id; `reporte_id BIGINT UNSIGNED` NULL FK → reportes.id; `accion VARCHAR(30)` NN CHECK `APROBAR`, `RECHAZAR`, `ARCHIVAR`, `RESTAURAR`, `RESTAURAR_BAJA`, `REVISAR_REPORTE`, `RESOLVER_REPORTE`, `DESCARTAR_REPORTE`; `estado_receta_anterior, estado_receta_nuevo VARCHAR(20)` NULL; `estado_reporte_anterior, estado_reporte_nuevo VARCHAR(20)` NULL; `detalle VARCHAR(1000)` NULL; `creado_en DATETIME(6)` NN. Para cada par de estados, CHECK: ambos NULL o ambos explícitamente NO NULL y pertenecientes al dominio correspondiente; no basta con comparaciones que permitan UNKNOWN. Índices `(receta_id, creado_en, id)`, `(actor_id, creado_en, id)` y `(reporte_id, creado_en, id)`.

Las acciones sobre reporte requieren `reporte_id` y estados de reporte; las acciones editoriales requieren ambos estados de receta y reporte NULL. `RESTAURAR` corresponde a la transición de moderación `ARCHIVADA → PENDIENTE`; `RESTAURAR_BAJA` registra únicamente la restauración de baja `PUBLICADA → PENDIENTE`, realizada por autor o ADMIN. El CHECK de forma distingue acciones de reporte de editoriales y exige los pares correspondientes, con NULL explícitos. La aplicación verifica además que el reporte pertenezca a la receta, que los pares de estados correspondan a la acción, y registra el cambio y la auditoría en una transacción. Estas reglas cruzadas no se garantizan solo con las FK simples. Los registros son de solo inserción para la aplicación; política de acceso y retención pendiente.

### auditoria_administrativa

Complementa la auditoría de moderación y conserva el identificador real del recurso mediante FK tipadas, no una referencia polimórfica sin integridad. `id BIGINT UNSIGNED` PK autoincremental; `actor_id BIGINT UNSIGNED` NN FK → usuarios.id; `accion VARCHAR(30)` NN CHECK `DESACTIVAR_CUENTA`, `REACTIVAR_CUENTA`, `BAJA_RECETA`, `RESTAURAR_RECETA`, `ASIGNAR_ROL`, `RETIRAR_ROL`; `usuario_afectado_id BIGINT UNSIGNED` NULL FK → usuarios.id; `receta_afectada_id BIGINT UNSIGNED` NULL FK → recetas.id; `rol_id BIGINT UNSIGNED` NULL FK → roles.id; `detalle VARCHAR(1000)` NN (motivo o detalles no sensibles); `creado_en DATETIME(6)` NN. Índices `(actor_id, creado_en, id)`, `(usuario_afectado_id, creado_en, id)`, `(receta_afectada_id, creado_en, id)` y `(rol_id, creado_en, id)`.

CHECK de forma por acción: desactivar/reactivar requiere usuario no nulo, receta y rol nulos; baja/restauración requiere receta no nula, usuario y rol nulos; asignar/retirar rol requiere usuario y rol no nulos y receta nula. Así exactamente un usuario o receta identifica el recurso afectado; el rol identifica el cambio de asignación. `detalle` es obligatorio y debe excluir contraseñas, hashes, tokens y demás información sensible. Actor activo con permiso ADMIN, recurso y operación se validan en aplicación; cambio y auditoría se confirman atómicamente. No se borran ni editan registros mediante operaciones ordinarias; acceso y retención quedan pendientes de política. Restauración administrativa de una receta `PUBLICADA` genera también `RESTAURAR_BAJA` en auditoría de moderación, en la misma transacción; no son eventos duplicados funcionalmente, pues registran operación administrativa y transición editorial respectivamente.

## Cardinalidades y datos calculados

- Usuario 1:N recetas, reportes, recuperaciones y eventos de auditoría como actor; usuario, receta o rol 1:N eventos administrativos según las FK opcionales y su CHECK. Receta 1:N multimedia, reportes y auditoría; reporte 1:N eventos de auditoría opcionales.
- Usuario N:M rol mediante usuarios_roles; receta N:M ingrediente mediante recetas_ingredientes; receta N:M categoría mediante recetas_categorias; usuario N:M receta mediante favoritos. Cada relación tiene PK compuesta y FK a ambos extremos.
- Cantidades originales, unidad y porciones base se almacenan. Cantidades escaladas, número de favoritos y resultados de búsqueda son derivados bajo demanda; no se persisten. Estados y fechas editoriales sí se almacenan. Paginación estable por `(creado_en, id)` o `(publicado_en, id)` según orden; el desempate por ID evita orden indeterminado, aunque offset puede variar ante escrituras concurrentes. Usar cursor para continuidad cuando se requiera.
