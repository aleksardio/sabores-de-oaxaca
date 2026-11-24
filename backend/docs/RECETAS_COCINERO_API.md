# Recetas propias

Base: `/api/v1`. Enviar `Authorization: Bearer <JWT>`. La identidad y los roles se comprueban en cada solicitud; `ADMIN` no implica `COCINERO`. Una cuenta que pierde `COCINERO` conserva la lectura de sus recetas.

## POST /mis-recetas

Requiere `COCINERO`. El servidor asigna el autor autenticado y el estado `BORRADOR`. Campos desconocidos, incluidos `autor_id` y `estado`, se rechazan. Categorías e ingredientes deben existir previamente; sus identificadores son datos del catálogo disponible en el entorno. No se implementa un endpoint nuevo de ingredientes.

```json
{
  "titulo": "Salsa de chile",
  "descripcion": "Salsa casera",
  "preparacion": "Tostar y moler.",
  "tipo": "COMUN",
  "porcionesBase": 4,
  "categorias": [1],
  "ingredientes": [{"ingredienteId": 2, "cantidad": 2.5, "unidad": "G", "orden": 1, "nota": "molido"}],
  "multimedia": [{"tipo": "IMAGEN", "url": "https://ejemplo.invalid/foto.jpg", "textoAlternativo": "Salsa", "orden": 1}]
}
```

Los tres arreglos son obligatorios y pueden estar vacíos en borradores; sus límites son 100 categorías, 500 ingredientes y 100 elementos multimedia. Título, descripción y preparación no pueden estar vacíos; título admite hasta 200 caracteres, descripción 65535 y preparación 16777215. Tipo: `COMUN` o `TRADICIONAL_OAXAQUENA`. Porciones y órdenes son enteros positivos. No repetir categorías, ingredientes ni órdenes dentro de cada colección. Las unidades son `G`, `KG`, `ML`, `L`, `PIEZA`, `CUCHARADA`, `CUCHARADITA`, `TAZA` y `AL_GUSTO`; esta última exige cantidad nula, las demás una cantidad positiva de hasta 9 dígitos enteros y 3 decimales. Nota y texto alternativo admiten hasta 255 caracteres. Multimedia admite `IMAGEN` o `VIDEO` y URL HTTPS de hasta 2048 caracteres; no se suben archivos.

Respuesta `201`: `{"id":1,"estado":"BORRADOR","version":0}`. `400`: entrada o referencias inválidas; `401`: JWT ausente o inválido; `403`: falta rol. La receta y sus asociaciones se guardan en una sola transacción.

## PUT /mis-recetas/{id}

Requiere JWT y `COCINERO`; solo el propietario puede editar, y únicamente en `BORRADOR` o `RECHAZADA` no eliminada. Se reemplazan todos los campos y arreglos: no es una actualización parcial. Se aplican las mismas validaciones de POST. No incluir autor ni estado.

Enviar el JSON completo de POST más `version`, obtenida del GET privado. Por ejemplo:

```json
{
  "version": 0,
  "titulo": "Salsa de chile",
  "descripcion": "Salsa casera",
  "preparacion": "Tostar y moler.",
  "tipo": "COMUN",
  "porcionesBase": 4,
  "categorias": [1],
  "ingredientes": [{"ingredienteId": 2, "cantidad": 2.5, "unidad": "G", "orden": 1, "nota": "molido"}],
  "multimedia": [{"tipo": "IMAGEN", "url": "https://ejemplo.invalid/foto.jpg", "textoAlternativo": "Salsa", "orden": 1}]
}
```

Un `200` devuelve `{"id":1,"estado":"BORRADOR","version":1}`. La versión aumenta en cada edición exitosa, incluso si solo cambian asociaciones. `400` indica JSON, versión o referencias inválidos; `401`, JWT ausente o inválido; `403`, falta de rol; `404`, receta inexistente o ajena; `409`, versión obsoleta o estado/baja no editable. En caso de error no se confirman cambios parciales.

## DELETE /mis-recetas/{id}

Requiere `COCINERO` y ser propietario. Enviar la versión obtenida del GET en la cabecera `If-Match: "0"` (comillas incluidas); no se envía cuerpo. La baja lógica está permitida para una receta activa en cualquiera de los cinco estados. No modifica el estado ni elimina asociaciones; incrementa la versión y responde `204` sin cuerpo. Una receta pública dada de baja deja de aparecer en el catálogo. La baja administrativa de recetas ajenas requiere auditoría y no está implementada en este endpoint.

## POST /mis-recetas/{id}/enviar-revision

Requiere `COCINERO`, propiedad y la cabecera `If-Match: "0"` con la versión vigente; no requiere cuerpo. Solo admite una receta `BORRADOR` no eliminada y completa: título, descripción y preparación no vacíos, porciones positivas, al menos un ingrediente y una categoría. Cambia el estado a `PENDIENTE`, incrementa la versión y responde `200`, por ejemplo `{"id":1,"estado":"PENDIENTE","version":1}`. No publica la receta; no se permite reenviar una receta pendiente ni enviar una rechazada directamente.

Para ambos endpoints: `400` si falta `If-Match` o no contiene exactamente un entero no negativo entre comillas, dentro del rango de `Long`; `401` sin JWT válido; `403` sin `COCINERO`; `404` si la receta no existe o es ajena; `409` por versión obsoleta, estado incompatible, baja repetida o receta incompleta. La versión del encabezado no admite listas, comodín ni etiquetas débiles. La versión y la operación se comprueban en una transacción con bloqueo optimista; una operación concurrente puede producir `409`.

## Consultas

* `GET /mis-recetas?pagina=0&tamano=12`: lista paginada propia; `pagina` empieza en 0 y `tamano` admite 1–50. Incluye estado, versión y fecha de baja lógica.
* `GET /mis-recetas/{id}`: detalle propio con categorías, ingredientes y multimedia; devuelve `404` si no existe o pertenece a otra persona. Las consultas incluyen recetas propias dadas de baja. Sin JWT válido: `401`.

## Bruno y React

En Bruno, configurar la URL base, autenticación Bearer con el JWT obtenido en login y `Content-Type: application/json`; enviar el ejemplo por POST sustituyendo los IDs por registros existentes. Consultar después con GET usando el `id` devuelto y enviar por PUT el cuerpo completo con la `version` leída. En React, enviar el mismo JSON con `fetch`, cabeceras `Authorization` y `Content-Type`; conservar el ID y la versión devuelta. Ante `409`, conservar los cambios locales, volver a consultar el detalle y permitir al usuario comparar y decidir antes de reenviar con la nueva versión; no reintentar automáticamente. Nunca enviar autor o estado. El servidor debe permitir el origen de React en su configuración CORS.

Para probar las acciones en Bruno, realizar primero GET del detalle y copiar `version`. Crear una solicitud DELETE a `/mis-recetas/{id}` o POST a `/mis-recetas/{id}/enviar-revision`, sin cuerpo, con Bearer y cabecera `If-Match` cuyo valor sea la versión entre comillas, por ejemplo `"0"`. En React, usar `headers: { Authorization: 'Bearer ' + token, 'If-Match': '"' + version + '"' }`; tras `200` conservar la versión de respuesta y tras `204` consultar de nuevo si se necesita el estado. Ante `409`, recargar y pedir confirmación en lugar de reintentar automáticamente.

## Rol en desarrollo

La asignación es una operación administrativa controlada, no una función pública de registro. En una base de desarrollo aislada, una persona autorizada puede asignar `COCINERO` mediante `usuarios_roles`, seleccionando el usuario por ID y el rol por código, con `asignado_en` y comprobando previamente que no exista la relación. No usar esta intervención directa como sustituto de la auditoría administrativa requerida en producción.
