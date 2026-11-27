# Índice de la API REST

Base `/api/v1`. Los endpoints protegidos requieren `Authorization: Bearer <JWT>`; `401` indica sesión ausente o inválida y `403` falta de permiso. Los roles son acumulables, no jerárquicos. Los contratos enlazados detallan campos, validaciones y errores. No usar ejemplos con cuentas o datos reales.

| Área | Operaciones principales | Acceso y contrato |
| --- | --- | --- |
| Salud y sesión | `GET /public/health`; `POST /auth/registro`, `/auth/login`, `/auth/logout`; `GET /auth/me` | Registro y login públicos; perfil y logout autenticados. [Autenticación](AUTENTICACION_API.md), [registro](REGISTRO_API.md). |
| Recuperación | `POST /auth/recuperar-contrasena`, `/auth/restablecer-contrasena` | Públicos; deshabilitados por defecto, `503` si no se habilitan. [Contrato](RECUPERACION_CONTRASENA_API.md), [correo](CORREO_RECUPERACION.md). |
| Catálogo | `GET /recetas`, `/recetas/{id}`, `/categorias`, `/ingredientes` | Públicos; recetas visibles publicadas y no dadas de baja. [Contrato](RECETAS_PUBLICAS_API.md). |
| Recetas propias | `GET /mis-recetas`, `/mis-recetas/{id}`; `POST /mis-recetas`, `/{id}/enviar-revision`; `PUT` y `DELETE /mis-recetas/{id}` | Autenticación, propiedad y reglas editoriales; creación requiere COCINERO. [Contrato](RECETAS_COCINERO_API.md). |
| Multimedia | `POST /multimedia/uploads` | COCINERO; requiere almacenamiento configurado. [Contrato](MULTIMEDIA_UPLOADS_API.md). |
| Favoritos | `GET /favoritos`; `POST` y `DELETE /favoritos/{recetaId}` | Autenticados; mutaciones devuelven `204`. [Contrato](FAVORITOS_API.md). |
| Moderación | `GET /moderacion/recetas`, `/{id}`; `POST /moderacion/recetas/{id}/aprobar`, `/rechazar` | MODERADOR o ADMIN, sujeto a conflictos de interés. [Contrato](MODERACION_API.md). |
| Reportes | `POST /recetas/{id}/reportes`; `GET /moderacion/reportes`, `/{id}`; `POST /moderacion/reportes/{id}/descartar`, `/dar-baja` | Crear requiere autenticación; resolver requiere MODERADOR o ADMIN y ausencia de conflicto. [Contrato](REPORTES_API.md). |
| Usuarios administrativos | `GET /admin/usuarios`, `/{id}`; `PUT` y `DELETE /admin/usuarios/{id}/roles/cocinero` | ADMIN. [Contrato](ADMIN_USUARIOS_API.md). |
| Recetas administrativas | `GET /admin/recetas`, `/{id}`; `POST /admin/recetas/{id}/baja`, `/restaurar` | ADMIN; acciones con `If-Match` y justificación. [Contrato](ADMIN_RECETAS_API.md). |

La alerta SMS de reporte es un efecto opcional del backend, no una ruta REST:
se activa por configuración y usa Infobip. Una respuesta HTTP no garantiza entrega;
consultar [SMS](SMS_REPORTES_INFOBIP.md). No hay integración WhatsApp.
