# Administración de usuarios

Base `/api/v1/admin/usuarios`. Todas las operaciones requieren `Authorization: Bearer <JWT>` válido y rol `ADMIN`; `MODERADOR`, `USUARIO` y `COCINERO` sin `ADMIN` reciben `403`, y un token ausente o inválido `401`. Los roles se consultan en MySQL al autenticar cada solicitud. No se modifican contraseñas ni configuraciones JWT.

## Listado

`GET /api/v1/admin/usuarios?texto=ana&rol=COCINERO&activo=true&pagina=0&tamano=20`

Todos los filtros son opcionales. `texto` busca una subcadena literal, sin distinguir mayúsculas, en nombre visible o correo (hasta 100 caracteres; `%`, `_` y `!` son literales). `rol` admite exactamente `ADMIN`, `MODERADOR`, `COCINERO` o `USUARIO`. `activo` es `true` o `false` y refleja si `eliminado_en` es nulo. `pagina` comienza en 0; `tamano` va de 1 a 100, por defecto 20. Orden ascendente por ID. La paginación por desplazamiento puede variar si se modifican usuarios entre peticiones. Parámetros inválidos: `400`.

Ejemplo `200` (datos ilustrativos):

```json
{"contenido":[{"id":12,"nombreVisible":"Ana","correo":"ana@ejemplo.invalid","activo":true,"creadoEn":"2026-01-01T12:00:00","roles":["COCINERO","USUARIO"]}],"pagina":0,"tamano":20,"totalElementos":1,"totalPaginas":1}
```

Los datos personales están limitados a la información administrativa mostrada. No se devuelven hashes, credenciales, ni entidades JPA. Las fechas almacenadas representan UTC.

## Detalle y rol COCINERO

* `GET /{id}`: `200` con un objeto del listado o `404` si no existe.
* `PUT /{id}/roles/cocinero`: asigna `COCINERO`; `204` sin cuerpo. Si ya estaba asignado, también devuelve `204`.
* `DELETE /{id}/roles/cocinero`: retira `COCINERO`; `204` sin cuerpo. Si ya estaba ausente, también devuelve `204`.

Las operaciones de rol no aceptan un código proporcionado por el cliente: no existen rutas para asignar `ADMIN` ni `MODERADOR`. Ambas son transaccionales, serializan cambios para el usuario mediante bloqueo de fila y devuelven `404` si no existe o `409` si está inactivo. El retiro no elimina recetas ni otros roles. No se fuerza logout: el siguiente request con un token aún válido consulta los roles actuales. El frontend debe consultar de nuevo el detalle tras la operación.

Los cambios de rol no generan actualmente una auditoría específica; definirla por separado antes de utilizar el panel si el despliegue requiere trazabilidad administrativa. Para probar con Bruno: iniciar sesión como administrador, configurar Bearer, consultar el listado y utilizar PUT o DELETE sin cuerpo sobre la ruta fija de cocinero, con un usuario de pruebas.
