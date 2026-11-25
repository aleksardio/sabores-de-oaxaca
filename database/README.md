# Base de datos y entrega

El diagrama [ER](../backend/docs/DIAGRAMA_ER.md) es conceptual; las restricciones reales se definen en [V1–V7](../backend/src/main/resources/db/migration/) y el [modelo de datos](../backend/docs/MODELO_DATOS.md). V5 incorpora cuatro roles oficiales; V4 almacena hashes de recuperación, nunca tokens en claro. El diagrama no representa todos los atributos o versiones: contrastar con las migraciones. No modificar migraciones aplicadas ni incorporar datos personales al repositorio.

## Volumen de ejemplo

El documento [PLAN_MIGRACIONES](../backend/docs/PLAN_MIGRACIONES.md) propone 10–15 ingredientes y recetas ficticias, y 10–15 categorías solo si son útiles y aprobadas; no identifica esas cifras como obligación para todas las tablas. El enunciado original de la asignación no está disponible en este repositorio: **pendiente confirmar los mínimos oficiales**. El script reproducible [recetas_oaxaquenas.sql](../backend/datos-demo-local/recetas_oaxaquenas.sql) prepara cuatro recetas —tres publicadas y un borrador—, nueve ingredientes y dos categorías como máximo si no existen. Requiere un autor activo elegido y puede reutilizar filas existentes; los totales efectivos dependen de la base. Las imágenes de ejemplo usan dominios `.invalid`. No crea cuentas ni secretos. Las recetas y categorías por sí solas no cumplen el plan propuesto de 10–15; faltaría confirmar el requisito y preparar contenido ficticio adicional revisado. No se han inspeccionado ni alterado datos de producción.

Para comprobar cantidades en una base autorizada, ejecutar [`consultas_verificacion_entrega.sql`](consultas_verificacion_entrega.sql) con un usuario de solo lectura después de seleccionar el esquema explícitamente. Consultar [instrucciones del script demo](../backend/datos-demo-local/README.md); usar solo un esquema de desarrollo aislado y respaldado, sin `--force`. Nunca utilizarlo en producción.

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
