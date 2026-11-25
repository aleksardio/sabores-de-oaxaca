# Reportes de recetas

Base `/api/v1`. Las fechas son UTC. Todas las rutas requieren `Authorization: Bearer <JWT>`. Un token ausente o inválido produce `401`; no se requiere `COCINERO` para reportar.

## Crear reporte

`POST /recetas/{id}/reportes`, `Content-Type: application/json`:

```json
{"motivo":"La información de esta receta es incorrecta."}
```

El motivo es obligatorio, no puede ser solo espacios y admite hasta 500 caracteres. Solo pueden reportarse recetas `PUBLICADA`, no eliminadas y cuyo autor esté activo. El autor no puede reportar su receta (`403`). Una receta no visible o inexistente responde `404`; un reporte `ABIERTO` o `EN_REVISION` del mismo usuario y receta produce `409`. Una vez resuelto o descartado, se puede volver a reportar si la receta sigue visible.

Respuesta `201` ilustrativa:

```json
{"id":7,"recetaId":12,"motivo":"La información de esta receta es incorrecta.","estado":"ABIERTO","creadoEn":"2026-11-24T12:00:00"}
```

## Bandeja de moderación

`GET /moderacion/reportes?estado=ABIERTO&pagina=0&tamano=12` requiere `MODERADOR` o `ADMIN`; los demás usuarios reciben `403`. Los filtros son opcionales. Estados: `ABIERTO`, `EN_REVISION`, `RESUELTO`, `DESCARTADO`. La página comienza en 0 y el tamaño está entre 1 y 50; orden ascendente por fecha de creación y después ID. Los parámetros inválidos responden `400`. La paginación por desplazamiento puede cambiar con la actividad concurrente.

Respuesta `200` ilustrativa:

```json
{"contenido":[{"id":7,"recetaId":12,"titulo":"Mole","motivo":"Información incorrecta","creadoEn":"2026-11-24T12:00:00","reportante":"Ana","estado":"ABIERTO","resueltoEn":null}],"pagina":0,"tamano":12,"totalElementos":1,"totalPaginas":1}
```

`GET /moderacion/reportes/{id}` devuelve el objeto de `contenido` o `404` si no existe. No se exponen correo, credenciales ni entidades.

## Decisiones

`POST /moderacion/reportes/{id}/descartar` cambia un reporte pendiente a `DESCARTADO` y deja la receta intacta. `POST /moderacion/reportes/{id}/dar-baja` requiere una receta aún publicada, activa y con autor activo; realiza baja lógica, marca el reporte como `RESUELTO` y resuelve todos los demás reportes pendientes de la misma receta. No borra relaciones ni archivos. Ambos responden `200` con el objeto de detalle actualizado y registran fecha de resolución. Una segunda decisión o una receta que ya no admite baja responde `409`; un reporte inexistente responde `404`.

Cada transición registra una fila `DESCARTAR_REPORTE` o `RESOLVER_REPORTE` en `auditoria_moderacion`. La baja se registra además como `BAJA_RECETA` en `auditoria_administrativa`, con el ID del reporte originador en `detalle`. Los demás reportes resueltos por la baja identifican el reporte originador en su auditoría. Todas las operaciones y auditorías son transaccionales. La serialización usa bloqueo de fila de receta, por lo que escrituras externas a esta API deben respetar el mismo protocolo para garantizar la unicidad de reportes abiertos.

Un `MODERADOR` o `ADMIN` no puede decidir sobre un reporte que haya creado ni sobre uno relacionado con una receta de su autoría: recibe `403` y no se modifica la receta, el reporte ni la auditoría. Como dar de baja resuelve todos los reportes pendientes de la receta, también se rechaza si alguno de esos reportes fue creado por el actor, aunque se haya seleccionado otro reporte.

## Bruno y React

En Bruno crear un POST a `{{baseUrl}}/api/v1/recetas/{{recetaId}}/reportes`, autenticación Bearer y JSON del ejemplo. Para moderar, usar un token de moderador en GET de bandeja y POST sin cuerpo a la ruta de decisión. En React, enviar `fetch(url, {method: 'POST', headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'}, body: JSON.stringify({motivo})})`; no confiar en controles de rol del cliente como autorización. Ante `409`, volver a consultar el estado en lugar de repetir automáticamente.
