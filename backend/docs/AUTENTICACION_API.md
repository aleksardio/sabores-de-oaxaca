# Autenticación

Con `dev` y MySQL configurados, `POST /api/v1/auth/login` recibe JSON:

```json
{"correo":"persona@ejemplo.invalid","contrasena":"Ejemplo1!"}
```

El ejemplo es ficticio. Respuesta 200:

```json
{"token":"<JWT>","tipo":"Bearer","expiraEnSegundos":1800}
```

Enviar `Authorization: Bearer <JWT>` en `GET /api/v1/auth/me`. Respuesta 200:

```json
{"id":1,"nombreVisible":"Nombre de ejemplo","correo":"persona@ejemplo.invalid","roles":["USUARIO"]}
```

JSON mal formado o campos obligatorios ausentes producen 400. Credenciales incorrectas, cuenta inactiva y tokens ausentes o inválidos producen 401 genérico; un usuario autenticado sin autorización recibe 403. Las rutas aún no implementadas están denegadas. Las respuestas no contienen contraseñas ni hashes.

## Cierre de sesión global

`POST /api/v1/auth/logout`, con `Authorization: Bearer <JWT>` y sin cuerpo, responde **204 No Content**. Incrementa atómicamente la versión del usuario y revoca todos sus JWT anteriores, también en otros dispositivos. Token ausente, inválido, vencido o ya revocado: **401**. Un usuario autenticado que carezca de permisos para una ruta protegida recibe **403**; logout solo requiere autenticación. Después de cerrar sesión se necesita un nuevo login. Ante una actualización concurrente de la cuenta puede devolver **409**; no se reintenta automáticamente. En cierres simultáneos con la misma versión, uno puede responder 204 y el otro 401 o 409, según cuándo se detecte el conflicto.

En Bruno crea un POST a `http://localhost:8080/api/v1/auth/logout` y configura Bearer Token con el JWT del login. Comprueba el 204 y después envía el mismo token a `/me`: debe responder 401. No guardes tokens en colecciones versionadas.

## Política de roles

Las autoridades `ROLE_USUARIO`, `ROLE_COCINERO`, `ROLE_MODERADOR` y `ROLE_ADMIN` se calculan desde MySQL en cada petición; no se confía en roles del JWT. Los roles son acumulables y sin jerarquía implícita. Para futuras operaciones, el perfil propio corresponde a USUARIO, la creación y edición de recetas propias a COCINERO, la moderación a MODERADOR o ADMIN y la administración a ADMIN. ADMIN no obtiene automáticamente los permisos de USUARIO o COCINERO. Los servicios transaccionales deberán verificar propiedad, estado y las excepciones de autor/moderador descritas en [reglas de negocio](REGLAS_NEGOCIO.md); ninguna regla de rol sustituye estas comprobaciones. Aún no se exponen endpoints de negocio.

La seguridad de métodos de Spring está habilitada. Las anotaciones reutilizables siguientes se aplican a métodos públicos invocados a través del proxy de Spring (la autoinvocación no se intercepta):

| Anotación | Autorización |
|---|---|
| `@Autenticado` | Cualquier usuario autenticado |
| `@SoloCocinero` | `COCINERO` |
| `@Moderacion` | `MODERADOR` o `ADMIN` |
| `@SoloAdmin` | `ADMIN` |

Estas anotaciones no comprueban propiedad, estado editorial ni conflictos de interés; esas reglas permanecen pendientes de implementación en los servicios de negocio.

## Concurrencia de perfil

`Usuario` utiliza `@Version` con `version_perfil` (V6), independiente de `version_tokens`, que solo invalida JWT. Las escrituras JPA de entidades administradas comparan e incrementan la versión; un conflicto devuelve 409 sin reintento automático. Logout usa una actualización condicional que compara ambas versiones e incrementa ambas en la misma sentencia. Los futuros servicios deben cargar la entidad en una transacción, aplicar cambios y tratar explícitamente el conflicto sin repetir efectos secundarios. JPQL masivo y SQL directo omiten `@Version`: deben comparar e incrementar explícitamente `version_perfil` de forma atómica y controlar el número de filas afectadas, o no deben emplearse. No confiar en entidades desacopladas sin un protocolo de versión explícito. El contador firmado tiene límite `Long.MAX_VALUE`; una operación al agotarlo requiere intervención administrativa.

## Configuración

`JWT_SECRET_BASE64` es obligatorio fuera de `bootstrap`: Base64 estándar de al menos 32 bytes generados criptográficamente al azar. La longitud y formato se validan al iniciar, pero no es posible demostrar la entropía de una clave por su contenido. Guárdala en un gestor de secretos y distribúyela de manera segura; no la incluyas en Git. Para desarrollo efímero en PowerShell:

```powershell
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$env:JWT_SECRET_BASE64 = [Convert]::ToBase64String($bytes)
Remove-Variable bytes
```

Cambiarla invalida los tokens anteriores. `JWT_ISSUER` y `JWT_AUDIENCE` son opcionales y por defecto valen `sabores-oaxaca-api` y `sabores-oaxaca-web`; `JWT_TTL_SECONDS` vale 1800 por defecto, con rango 1–86400. Configure los mismos valores en las instancias que comparten tokens. Nunca registre tokens o encabezados Authorization en logs.

La validación usa tolerancia temporal de cero segundos: `iat` no puede estar en el futuro, `exp` debe ser posterior a `iat` y el token debe estar vigente. Sincroniza los relojes de las instancias.

La API es stateless, no usa cookies de autenticación y tiene CSRF deshabilitado para Bearer en encabezado. Antes de introducir autenticación mediante cookies debe revisarse CSRF. CORS se configura por origen para `/api/v1/**`; consulta [integración React](INTEGRACION_REACT.md). Usar HTTPS fuera de pruebas locales.

## Bruno

1. Inicia el backend `dev` siguiendo `backend/README.md` y crea una cuenta con el contrato de registro.
2. En Bruno crea una petición POST a `http://localhost:8080/api/v1/auth/login`, con `Content-Type: application/json` y el JSON anterior adaptado a la cuenta de prueba.
3. Copia temporalmente el campo `token` de la respuesta; no lo guardes en archivos de colección versionados.
4. Crea una petición GET a `http://localhost:8080/api/v1/auth/me` y añade el encabezado `Authorization: Bearer <token>` o selecciona Bearer Token en Auth. Envía la solicitud y comprueba roles y datos públicos.
