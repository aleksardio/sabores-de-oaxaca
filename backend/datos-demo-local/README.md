# Datos ficticios de demostración

`recetas_oaxaquenas.sql` es una carga manual para desarrollo aislado, **no una migración Flyway**. En una base vacía de datos demo con V1–V7 y un autor activo, prepara 13 recetas (11 publicadas y 2 borradores), 5 categorías funcionales y 27 ingredientes. Son versiones ilustrativas, no recetas culturalmente verificadas; las URL de imágenes en `example.invalid` son ficticias y no cargarán. El enunciado oficial y sus mínimos no están disponibles para confirmar requisitos adicionales.

## Ejecución segura

1. Usar solo una base MySQL 8 de desarrollo autorizada y respaldada, con V1–V7 aplicadas. Nunca ejecutar en producción. El usuario MySQL necesita `SELECT`, `INSERT` en las tablas indicadas y `CREATE TEMPORARY TABLES`.
2. Elegir explícitamente el ID de un usuario de desarrollo activo ya existente. No se crean usuarios, contraseñas ni roles; no se modifican los existentes. Verificar el destino y autor con una consulta de solo lectura, sin compartir datos personales.
3. Desde la raíz del repositorio ejecutar **en modo batch**, sustituyendo `123` y los marcadores por valores locales autorizados. El cliente solicita la contraseña interactivamente; no escribirla en el comando. En `cmd.exe` (no PowerShell):

   ```cmd
   mysql --default-character-set=utf8mb4 --host=127.0.0.1 --port=3306 --user=USUARIO_MYSQL --password --init-command="SET @demo_autor_id=123" BASE_DESARROLLO < backend/datos-demo-local/recetas_oaxaquenas.sql
   ```

No usar `--force`, redirecciones que oculten errores ni copias concurrentes. El proceso debe detenerse y cerrar la conexión al primer error: InnoDB revierte la transacción pendiente. No ejecutar con `SOURCE` en una sesión interactiva que pudiera continuar hasta `COMMIT` después de un error. Comprobar código de salida y resultados; ante error revisar el estado antes de reintentar. Las tablas temporales son de sesión. Si el autor no existe o está desactivado no se insertan datos.

La salida posterior al `COMMIT` muestra los IDs y códigos de recetas creadas en esa ejecución, y luego todas las recetas marcadas. Las asociaciones de esas recetas también se crean en esa transacción. Los ingredientes y categorías se reutilizan por nombre según la colación; la salida no distingue cuáles de esos catálogos fueron creados, por lo que puede compararse su listado antes y después si se necesita auditoría. Las recetas se reconocen por el prefijo de descripción `[DEMO-LOCAL-SO-2026:código]`: no editarlo. Si ya existe el prefijo se omite la receta y no se toca ni se reparan sus asociaciones. Esto conserva los datos de la versión anterior, incluso su borrador incompleto; usar una base nueva para obtener el conjunto completo. No ejecutar cargas concurrentes: la comprobación de marcas no sustituye un índice único.

## Comprobación

Ejecutar [`database/consultas_verificacion_entrega.sql`](../../database/consultas_verificacion_entrega.sql) con un usuario de solo lectura. En una base nueva con autor válido se esperan 13 recetas demo: 11 `PUBLICADA`, 2 `BORRADOR`, todas con categoría e ingredientes, y cero huérfanos. Una segunda ejecución no debe crear recetas adicionales; los catálogos existentes se reutilizan. En bases con datos previos los conteos generales serán mayores y puede haber recetas demo anteriores que requieran revisión manual. Los favoritos, reportes y usuarios no se siembran: usar escenarios autorizados y cuentas ficticias creadas por los mecanismos normales.

El script escribe `categorias`, `ingredientes`, `recetas`, `recetas_categorias`, `recetas_ingredientes` y `recetas_multimedia`. Se consulta `usuarios` para validar el autor. Las recetas públicas solo aparecen en el catálogo mientras el autor siga activo y la receta no esté dada de baja.

### Validación realizada

En una instancia MySQL Community 8.0.46 aislada, con V1–V7 aplicadas por Flyway y un autor ficticio activo, la primera ejecución creó 13 recetas y la segunda no creó recetas adicionales. El resultado contenía 11 publicadas y 2 borradores, 27 ingredientes, 5 categorías, 66 relaciones receta–ingrediente y 13 relaciones receta–categoría; las consultas no detectaron huérfanos ni recetas demo sin asociaciones. Esta comprobación no sustituye la revisión de datos en otros esquemas ni confirma los requisitos oficiales de volumen.
