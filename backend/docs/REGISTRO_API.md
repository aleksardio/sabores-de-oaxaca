# Registro público

`POST /api/v1/auth/registro`, `Content-Type: application/json`; no requiere autenticación. Disponible con persistencia configurada (por ejemplo, perfil `dev`), no con el perfil temporal `bootstrap`.

```json
{"nombreVisible":"Nombre de ejemplo","correo":"persona@ejemplo.invalid","contrasena":"Ejemplo1!"}
```

Los ejemplos son ficticios; no usar esa contraseña para una cuenta real. Solo se aceptan esos tres campos; cualquier propiedad adicional, incluidos roles, ID o versionTokens, produce 400. Se eliminan espacios exteriores de nombre y correo, y el correo se convierte a minúsculas. Nombre: obligatorio, hasta 100 caracteres; correo: obligatorio, válido, hasta 254 caracteres. Contraseña: obligatoria, de 8–72 caracteres y hasta 72 bytes UTF-8, con al menos una letra mayúscula ASCII, un dígito y un carácter especial no alfanumérico ni espacio. El límite en bytes evita la truncación de BCrypt. No se modifica la contraseña antes de calcular su hash.

**201 Created**:

```json
{"id":1,"nombreVisible":"Nombre de ejemplo","correo":"persona@ejemplo.invalid"}
```

La respuesta no incluye contraseña, hash, rol ni token. Se asigna exclusivamente `USUARIO` en la misma transacción que la creación, con fecha UTC y `version_tokens=0`.

**400 Bad Request**, validación por campo (puede variar el mensaje cuando un campo incumple varias reglas):

```json
{"error":"Datos inválidos","campos":{"correo":"El correo no es válido"}}
```

Para JSON mal formado o propiedades adicionales: `{"error":"JSON inválido o campos no permitidos"}`. **409 Conflict** si el correo ya existe: `{"error":"El correo ya está registrado"}`. El índice único también protege frente a registros simultáneos. Las cuentas desactivadas mantienen reservado el correo.

La API usa seguridad sin estado (`STATELESS`) y CSRF deshabilitado porque no usa sesiones ni credenciales de autenticación enviadas automáticamente por cookies; consulta [autenticación](AUTENTICACION_API.md). Si se introducen cookies o cualquier otra credencial ambiental de navegador, se debe rediseñar la protección CSRF antes de habilitarlas. CORS se limita a orígenes configurados; consulta [integración React](INTEGRACION_REACT.md). El 409 permite enumerar correos registrados; antes de exponer el servicio en producción se deben aprobar mitigaciones (limitación de frecuencia, monitoreo y política de respuesta) sin sustituir HTTPS.
