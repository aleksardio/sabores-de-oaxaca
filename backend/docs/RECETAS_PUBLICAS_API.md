# Consultas públicas de recetas

Las consultas son GET y no requieren JWT. No existe escritura pública de recetas. Las recetas visibles deben estar publicadas, no estar dadas de baja y tener autor activo. Los DTO no incluyen correo, contraseñas ni versiones del autor.

## Catálogo

`GET /api/v1/recetas?titulo=mole&categoria=1&tipo=COMUN&pagina=0&tamano=12`

Todos los parámetros son opcionales. `titulo` es una subcadena de hasta 200 caracteres; `%`, `_` y `!` se interpretan literalmente. `categoria` es un identificador positivo; `tipo` es `COMUN` o `TRADICIONAL_OAXAQUENA`. `pagina` comienza en cero y `tamano` admite 1–50. El orden es ascendente por ID; la paginación por desplazamiento puede cambiar si se publican o retiran recetas entre solicitudes.

Ejemplo ilustrativo de la estructura:

```json
{"contenido":[{"id":1,"titulo":"Mole","descripcion":"Preparación","tipo":"COMUN","porcionesBase":4,"autor":{"id":1,"nombreVisible":"Autora","avatarUrl":null},"categorias":[{"id":1,"nombre":"Salsas","descripcion":null}]}],"pagina":0,"tamano":12,"totalElementos":1,"totalPaginas":1}
```

## Detalle y porciones

`GET /api/v1/recetas/1` o `GET /api/v1/recetas/1?porciones=2`. El detalle contiene además `preparacion`, `porcionesSolicitadas`, `ingredientes` y `multimedia`. Cada ingrediente tiene `id`, `nombre`, `cantidadBase`, `cantidadAjustada`, `unidad`, `orden` y `nota`; cada medio contiene `id`, `tipo`, `url`, `textoAlternativo` y `orden`.

Ejemplo ilustrativo de ingrediente para dos porciones a partir de cuatro:

```json
{"id":1,"nombre":"Chile","cantidadBase":2.000,"cantidadAjustada":1.000,"unidad":"G","orden":1,"nota":null}
```

Sin `porciones`, `porcionesSolicitadas` y `cantidadAjustada` son `null`. Se admiten porciones enteras de 1 a 100; el cálculo es `cantidadBase × porciones / porcionesBase`, redondeado a tres decimales HALF_UP. `AL_GUSTO` mantiene ambas cantidades nulas. No se convierten unidades. Los decimales muy pequeños pueden redondear a cero.

## Categorías y errores

`GET /api/v1/categorias` devuelve un arreglo de `{id,nombre,descripcion}` ordenado por nombre e ID. Los parámetros inválidos producen 400 y las recetas ocultas o inexistentes 404; los métodos no autorizados no son públicos. Una respuesta de validación tiene forma `{"error":"Parámetros inválidos"}`.

## Bruno y React

En Bruno, crear una petición GET con URL `{{baseUrl}}/api/v1/recetas`, sin autenticación, y añadir los parámetros deseados en Query. Para detalle, usar `{{baseUrl}}/api/v1/recetas/1` y opcionalmente `porciones`. `baseUrl` debe apuntar a la instancia local sin la ruta `/api/v1`.

React debe adaptar los identificadores numéricos y nombres de campos: los datos demo usan otros nombres e identificadores. No se incluyen campos demo como región o duración. Interpretar las cantidades como decimales y conservar unidad y orden; no suponer que hay multimedia o categorías.

## Datos ficticios

Usar únicamente un esquema de desarrollo aislado y autorizado, con V1–V6 aplicadas y respaldos apropiados. Crear un usuario de desarrollo mediante el registro existente y cargar en ese esquema categorías, ingredientes, recetas y relaciones mediante SQL o una herramienta local revisada; usar únicamente datos ficticios. Las recetas deben tener estado `PUBLICADA`, autor activo y cumplir las restricciones de V2. No incluir credenciales ni hashes conocidos en scripts compartidos, ni añadir datos demo a migraciones de producción. La prueba optativa `RecetasJpaMySqlTest` muestra inserciones en un esquema temporal dedicado; no ejecutar esa suite sobre una base existente.
