# Administración de usuarios

## Gestión de cuentas y moderadores

`POST /api/v1/admin/usuarios/{id}/desactivar` y `/reactivar` requieren ADMIN y devuelven `204`. La desactivación lógica revoca los JWT existentes y conserva datos y roles; reactivar no revive sesiones anteriores. Se rechaza con `409` la autodesactivación, la pérdida del último administrador activo o una transición redundante. Los cambios y su auditoría son transaccionales.

`PUT` y `DELETE /api/v1/admin/usuarios/{id}/roles/moderador` asignan o retiran MODERADOR a una cuenta activa y devuelven `204`. Tanto estos cambios como los de COCINERO invalidan los JWT cuando el rol cambia; las operaciones redundantes son idempotentes y no invalidan sesiones. No modifican otros roles. `401` indica sesión inválida, `403` falta de ADMIN, `404` cuenta inexistente y `409` cuenta inactiva o conflicto de estado. Al volver a iniciar sesión se consultan los roles actuales.

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

Las rutas de rol son fijas y no permiten asignar `ADMIN`. Las operaciones son transaccionales, serializan cambios para el usuario mediante bloqueo de fila y devuelven `404` si no existe o `409` si está inactivo. El retiro no elimina recetas ni otros roles. El frontend consulta de nuevo el detalle tras la operación.

Los cambios efectivos de rol y estado registran una fila en `auditoria_administrativa`; cambios redundantes de rol no producen auditoría ni invalidan sesiones. Probar escrituras solo con cuentas de prueba en un entorno aislado.
