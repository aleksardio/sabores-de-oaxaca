# API de moderación de recetas

Base `/api/v1/moderacion/recetas`. Requiere JWT Bearer y rol `MODERADOR` o `ADMIN`; los roles no son jerárquicos. Ninguno puede aprobar o rechazar sus propias recetas. No se reciben IDs de revisores del cliente.

## Consultas

`GET /api/v1/moderacion/recetas?pagina=0&tamano=12&tipo=COMUN` lista recetas `PENDIENTE` no eliminadas. `tipo` es opcional y admite `COMUN` o `TRADICIONAL_OAXAQUENA`; `pagina` inicia en 0, `tamano` va de 1 a 50, y el orden es por ID ascendente. La respuesta contiene `contenido`, `pagina`, `tamano`, `totalElementos` y `totalPaginas`. Cada resumen incluye `id`, `titulo`, `tipo`, `autorId`, `autor` y `version`.

`GET /api/v1/moderacion/recetas/{id}` devuelve una pendiente no eliminada, incluyendo título, descripción, preparación, tipo, porciones, estado, versión, nombre e ID del autor, categorías, ingredientes y multimedia. No devuelve correo, contraseñas ni tokens. `404` si no existe o no es una pendiente activa.

## Decisiones

`POST /api/v1/moderacion/recetas/{id}/aprobar` no necesita cuerpo. `POST /api/v1/moderacion/recetas/{id}/rechazar` requiere JSON, por ejemplo:

```json
{"motivo":"La preparación necesita más detalle"}
```

El motivo es obligatorio, no blanco y hasta 1000 caracteres después de quitar espacios extremos; no incluir campos adicionales. Ambas operaciones requieren `If-Match: "1"`, con la versión de la consulta como entero no negativo entre comillas. No admite comodín, lista ni etiqueta débil. La respuesta exitosa `200` tiene, por ejemplo:

```json
{"id":42,"estado":"PUBLICADA","version":2}
```

La aprobación cambia `PENDIENTE` a `PUBLICADA`, exige autor activo y receta completa, y fija `publicado_en` solo en la primera publicación. El rechazo cambia `PENDIENTE` a `RECHAZADA`. Ambas incrementan la versión y escriben en la misma transacción un evento en `auditoria_moderacion`, con actor autenticado, receta, acción, estados anterior y nuevo y, para rechazo, motivo. Una decisión fallida no debe confirmar auditoría ni cambio de estado.

Errores: `400` para filtros, cabecera o motivo inválidos; `401` sin JWT válido; `403` sin rol o por autorrevisión; `404` si no existe la receta; `409` si la versión es obsoleta, el estado no es pendiente, está dada de baja, el autor está inactivo o la receta no está completa para aprobar. Un fallo interno inesperado responde `500` con `{"error":"Error interno del servidor"}`, sin detalles de persistencia.

## Bruno y React

En Bruno configurar URL base y Bearer, consultar el detalle y copiar `version`; crear POST de aprobación o rechazo con `If-Match` igual a esa versión entre comillas, y para rechazo `Content-Type: application/json` y el cuerpo anterior. En React consultar el detalle antes de decidir y enviar `If-Match: '"' + version + '"'`; ante `409` recargar y mostrar el estado actualizado, sin reintentar decisiones automáticamente. El origen web debe estar autorizado en CORS.
