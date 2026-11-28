# Base de datos y entrega

El diagrama [ER](../backend/docs/DIAGRAMA_ER.md) es conceptual; las restricciones reales se definen en [V1–V9](../backend/src/main/resources/db/migration/) y el [modelo de datos](../backend/docs/MODELO_DATOS.md). V5 incorpora cuatro roles oficiales; V4 almacena hashes de recuperación, nunca tokens en claro; V8 y V9 agregan solicitudes e identidades Google. El diagrama no representa todos los atributos o versiones: contrastar con las migraciones. No modificar migraciones aplicadas ni incorporar datos personales al repositorio.

Las recetas usan baja lógica y versión optimista (V7). Sus asociaciones se
conservan al dar de baja o restaurar; las acciones administrativas registran
auditoría persistente. Restaurar una receta publicada la deja pendiente de
moderación. El equipo comunicó una validación de este flujo en MySQL 8 aislado;
véase el [checklist](../CHECKLIST_ENTREGA.md) para su alcance y pendientes.

## Volumen de ejemplo

La asignación oficial exige un mínimo de 10–15 registros por tabla principal. Los datos de producción verificados son **8 categorías, 40 ingredientes, 19 recetas (18 publicadas) y 9 usuarios activos**. Las asignaciones son `ADMIN`: 2, `COCINERO`: 6, `MODERADOR`: 1 y `USUARIO`: 9; los roles pueden coexistir en una cuenta. Las categorías y los usuarios activos están por debajo de 10; quedan por comprobar las demás tablas principales. No se ejecutó SQL durante esta revisión.

El script reproducible [recetas_oaxaquenas.sql](../backend/datos-demo-local/recetas_oaxaquenas.sql) prepara 13 recetas, 27 ingredientes y 5 categorías en una base nueva de desarrollo. Requiere un autor activo elegido y reutiliza filas existentes; los totales efectivos dependen de la base. Las imágenes de ejemplo usan dominios `.invalid`. No crea cuentas ni secretos; no siembra favoritos ni reportes y no demuestra por sí solo el cumplimiento en producción.

Para comprobar cantidades en una base autorizada, ejecutar [`consultas_verificacion_entrega.sql`](consultas_verificacion_entrega.sql) con un usuario de solo lectura después de seleccionar el esquema explícitamente. Consultar [instrucciones del script demo](../backend/datos-demo-local/README.md); usar solo un esquema de desarrollo aislado y respaldado, sin `--force`. Nunca utilizarlo en producción.

### Ampliación opcional de catálogos

[`seed_catalogos_entrega.sql`](seed_catalogos_entrega.sql) propone cinco categorías; su bloque opcional de 70 ingredientes está desactivado. Omite nombres existentes según la colación de MySQL y no identifica sinónimos distintos. Solo contempla inserciones en catálogos, no añade asociaciones ni es un respaldo. **No se ha ejecutado**: las categorías verificadas en producción siguen siendo 8, no 13; incluso si se autorizara su ejecución, el total dependería de los nombres existentes.

Para probarlo, preparar una base MySQL 8 aislada con V1–V9 y datos exclusivamente ficticios; respaldarla, comprobar host y nombre del esquema y usar una cuenta limitada a ese esquema. Medir antes y después con una cuenta de lectura:

```sql
SELECT COUNT(*) AS categorias FROM categorias;
SELECT COUNT(*) AS ingredientes FROM ingredientes;
SELECT COUNT(*) AS asociaciones_ingredientes FROM recetas_ingredientes;
SELECT COUNT(*) AS asociaciones_categorias FROM recetas_categorias;
```

Solo tras verificar el destino, importar el script con un usuario de inserción limitado, sin `--force`, y repetirlo en esa base para comprobar que los conteos de catálogos no cambian en la segunda ejecución. No ejecutarlo concurrentemente: la comprobación de existencia no evita carreras y los índices únicos pueden rechazar una inserción. Nunca apuntar a producción.

```sh
mysql --host=127.0.0.1 --user=USUARIO_PRUEBA --password ESQUEMA_AISLADO < database/seed_catalogos_entrega.sql
```

### Respaldo de ejemplo importable para entrega

La rúbrica pide un respaldo SQL incluido, pero actualmente no hay uno completo en el repositorio. Para prepararlo sin exponer datos, usar únicamente una base aislada creada con Flyway y datos ficticios, sin usuarios reales, contraseñas, hashes reutilizables, JWT, teléfonos, correos personales ni auditorías reales. Un dump de producción no queda anonimizado solo por llamarlo así. Desde esa base ficticia, generar con `mysqldump` como en la sección siguiente; revisar íntegramente el resultado y sus definiciones, restaurarlo en otro esquema aislado vacío y comprobar tablas, Flyway y conteos antes de proponer su inclusión. No hay ejemplo generado ni restauración acreditada en esta revisión; el seed no cumple ese requisito.

## Respaldo y restauración segura

Un respaldo real puede contener datos personales, hashes de contraseña y hashes de tokens. **No subirlo a Git ni compartirlo sin autorización**; guardarlo cifrado fuera del repositorio, restringir acceso y comprobar su retención. Ejemplo Ubuntu con MySQL 8 y una cuenta autorizada; el cliente solicitará la contraseña interactivamente (no colocarla en la línea de comandos):

```sh
umask 077
mysqldump --host=127.0.0.1 --user=USUARIO_LECTURA --password --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF --skip-add-drop-table NOMBRE_ESQUEMA > "$HOME/respaldo-sabores.sql"
```

Comprobar el código de salida, cifrar el archivo mediante el mecanismo aprobado por la organización y verificar integridad con una restauración en un esquema **nuevo y vacío** de pruebas. El ejemplo no incluye `--routines` ni `--events`; si se necesitan, evaluar permisos y contenido antes de añadirlos. Revisar el dump antes de restaurar: las opciones reducen `DROP TABLE`, pero no certifican que un respaldo externo carezca de sentencias destructivas, definiciones especiales o información sensible.

Crear por separado un esquema de prueba vacío con un nombre nuevo y usuario de permisos limitados, previa autorización; verificar nombre y destino mediante el cliente. Una vez revisado el archivo, restaurar únicamente allí:

```sh
mysql --host=127.0.0.1 --user=USUARIO_RESTAURACION --password ESQUEMA_NUEVO_VACIO < "$HOME/respaldo-sabores.sql"
```

No restaurar sobre una base existente o de producción. Inspeccionar `flyway_schema_history` y comprobar versión/colación y conteos antes de iniciar la aplicación. Una restauración sobre una base no vacía puede fallar o alterar datos; no usar `--force`, `DROP`, `TRUNCATE`, `clean` ni `repair` como atajo. El almacenamiento multimedia externo debe respaldarse y restaurarse por separado, de forma coordinada con la base.
