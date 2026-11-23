# Datos ficticios para pruebas manuales

`recetas_oaxaquenas.sql` es un script manual para desarrollo local, **no es una migración Flyway**. No se ejecuta al arrancar la aplicación. Incluye tres recetas publicadas y un borrador, ingredientes, categorías y referencias de multimedia. Las URL `example.invalid` son ficticias: no se espera que carguen imágenes.

## Antes de ejecutar

1. Revisar el SQL y confirmar que el destino es un entorno de desarrollo autorizado con V1–V6 aplicadas. No usar producción ni una base que no se desee modificar. Contar con un respaldo apropiado.
2. Elegir conscientemente una cuenta **activa de desarrollo** como autor. El script no crea cuentas ni modifica datos del autor, contraseña o roles. El usuario MySQL necesita permisos de lectura e inserción en las tablas indicadas y `CREATE TEMPORARY TABLES`.
3. Desde la raíz del repositorio, abrir el cliente sin escribir la contraseña en el comando:

   ```powershell
   mysql --default-character-set=utf8mb4 --host=127.0.0.1 --port=3306 --user=USUARIO_MYSQL --password sabores_oaxaca
   ```

4. En el cliente MySQL, comprobar `SELECT DATABASE();` y buscar la cuenta de desarrollo por su correo sin compartirlo:

   ```sql
   SELECT id, nombre_visible FROM usuarios
   WHERE correo = 'CORREO_DE_DESARROLLO' AND eliminado_en IS NULL;
   ```

5. Sustituir `123` por el ID elegido y ejecutar **en la misma sesión**. La ruta de `source` es relativa al directorio desde el que se abrió el cliente; también se puede usar una ruta absoluta con `/`:

   ```sql
   SET @demo_autor_id = 123;
   SOURCE backend/datos-demo-local/recetas_oaxaquenas.sql
   ```

El script informa si el autor no existe o está desactivado; en ese caso no inserta datos. La ejecución normal usa una transacción; si hay un error, no continuar con una ejecución parcial: revisar el error y la transacción, usar `ROLLBACK` si sigue activa e inspeccionar el estado antes de volver a intentar. No usar el modo `--force`. El cliente no debe ejecutar copias concurrentes del script.

Las categorías e ingredientes existentes se reutilizan por nombre según la colación de MySQL, sin alterar sus datos. Las recetas se identifican por marcas en la descripción. Si una marca ya existe, se omite esa receta y **no se actualizan sus asociaciones**; por ello, una receta demo editada, incompleta o desactivada previamente no se restaura automáticamente. No cambiar las marcas si se desea conservar la idempotencia. La tabla temporal de control existe solo en la sesión y no crea una tabla permanente.

## IDs y comprobación

El script imprime los IDs reales. También pueden consultarse después:

```sql
SELECT id, titulo, estado, autor_id
FROM recetas
WHERE descripcion IN (
  '[DEMO-LOCAL-SO-2026:mole] Receta ficticia para pruebas locales.',
  '[DEMO-LOCAL-SO-2026:tlayuda] Receta ficticia para pruebas locales.',
  '[DEMO-LOCAL-SO-2026:memelas] Receta ficticia para pruebas locales.',
  '[DEMO-LOCAL-SO-2026:borrador] Receta ficticia para pruebas locales.'
)
ORDER BY id;
```

En Bruno, con el backend conectado a la misma base y sin JWT, sustituir `ID_MOLE` por el ID obtenido:

- `GET http://localhost:8080/api/v1/recetas`: catálogo paginado con las tres recetas `PUBLICADA` y sin el borrador, siempre que el autor continúe activo y las recetas no estén eliminadas. Puede incluir otras recetas públicas preexistentes y el tamaño de página limita los resultados.
- `GET http://localhost:8080/api/v1/categorias`: incluye `Moles` y `Antojitos`, además de categorías preexistentes.
- `GET http://localhost:8080/api/v1/recetas/ID_MOLE`: detalle con cuatro porciones base, ingredientes, categoría y una URL de imagen ficticia. El ID del borrador devuelve 404.
- `GET http://localhost:8080/api/v1/recetas/ID_MOLE?porciones=2`: el chile seco pasa de `100.000` a `50.000 G`; el chocolate de `50.000` a `25.000 G`; la sal permanece con cantidad nula y unidad `AL_GUSTO`. Sin el parámetro, la cantidad ajustada es nula.

Las tablas escritas son `categorias`, `ingredientes`, `recetas`, `recetas_categorias`, `recetas_ingredientes` y `recetas_multimedia`; `usuarios` se consulta únicamente para validar el autor. No hay contraseñas ni datos demo dentro de las migraciones.
