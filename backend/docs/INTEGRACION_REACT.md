# Integración de React con la API

La URL base local es `http://localhost:8080/api/v1`. El frontend arranca con `npm run dev`; Vite usa por defecto el puerto 5173 y puede elegir otro si está ocupado. Configurar en el entorno del frontend `VITE_API_BASE_URL=http://localhost:8080/api/v1` y leerlo con `import.meta.env.VITE_API_BASE_URL`; no incluir una segunda vez `/api/v1`. Las variables `VITE_` son públicas en el navegador: nunca incluir secretos. Esta documentación no modifica el frontend.

`localhost` identifica la máquina del navegador. Para conectar equipos diferentes se necesita un host accesible, red y HTTPS adecuados; `localhost` no conecta equipos por Internet. CORS no sustituye autenticación ni controles de red.

## CORS y arranque

Con el perfil `dev`, el backend admite por defecto `http://localhost:5173` y `http://127.0.0.1:5173`. Se puede sobrescribir la lista completa, separada por comas, mediante `CORS_ALLOWED_ORIGINS` o `app.cors.allowed-origins`. Ejemplo PowerShell antes de arrancar el backend:

```powershell
$env:CORS_ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173'
```

Fuera de `dev` la lista predeterminada está vacía; configurar explícitamente los orígenes exactos HTTPS necesarios en producción. Incluir esquema y puerto cuando corresponda, sin ruta, barra final ni comodines. El backend permite `GET`, `POST`, `Content-Type` y `Authorization` en `/api/v1/**`; no habilita credenciales CORS. Los preflight `OPTIONS` no autorizan la operación real, que sigue sujeta a Spring Security. No se usan cookies de autenticación. La protección CSRF permanece desactivada por el modelo STATELESS con Bearer explícito: antes de introducir cookies u otras credenciales ambientales se debe rediseñar.

## Identidad

Todos los ejemplos son ficticios. Usar `Content-Type: application/json` en las solicitudes con cuerpo.

### Registro

`POST /auth/registro` recibe `{"nombreVisible":"Nombre","correo":"persona@ejemplo.invalid","contrasena":"Ejemplo1!"}`. Responde 201 con `{"id":1,"nombreVisible":"Nombre","correo":"persona@ejemplo.invalid"}`; no entrega token. Solo acepta esos tres campos. La contraseña requiere 8–72 caracteres y máximo 72 bytes UTF-8, mayúscula ASCII, dígito y carácter especial. Véase [registro](REGISTRO_API.md) para las validaciones completas.

### Login, perfil y logout

`POST /auth/login` recibe `{"correo":"persona@ejemplo.invalid","contrasena":"Ejemplo1!"}`. En 200 responde `{"token":"<JWT>","tipo":"Bearer","expiraEnSegundos":1800}`; el TTL puede configurarse. Enviar el valor de `token` como `Authorization: Bearer <JWT>` en `GET /auth/me`, que responde `{"id":1,"nombreVisible":"Nombre","correo":"persona@ejemplo.invalid","roles":["USUARIO"]}`.

`POST /auth/logout`, sin cuerpo y con Bearer, responde 204 y revoca globalmente los JWT anteriores de la cuenta, incluidos los de otros dispositivos. Puede responder 409 ante conflicto de escritura. Un nuevo login entrega otro JWT; no existen refresh tokens. El frontend debe gestionar expiración y rechazos 401. Guardar JWT en el navegador implica riesgo ante XSS: evaluar almacenamiento en memoria, CSP, dependencias y exposición según el modelo de amenazas. Nunca versionar tokens ni contraseñas.

## Recetas

Las lecturas siguientes no requieren JWT y solo muestran recetas `PUBLICADA`, no eliminadas y de autor activo. Los campos de autor público son `id`, `nombreVisible` y `avatarUrl`; no incluyen correo, contraseña ni versiones de seguridad.

`GET /recetas` admite `titulo` (subcadena no vacía de hasta 200 caracteres, `%` y `_` literales), `categoria` (ID positivo), `tipo` (`COMUN` o `TRADICIONAL_OAXAQUENA`), `pagina` (índice desde 0; por defecto 0) y `tamano` (1–50; por defecto 12). El orden es por ID ascendente. La respuesta tiene forma:

```json
{"contenido":[{"id":1,"titulo":"Mole","descripcion":"Descripción","tipo":"TRADICIONAL_OAXAQUENA","porcionesBase":4,"autor":{"id":1,"nombreVisible":"Autora","avatarUrl":null},"categorias":[{"id":1,"nombre":"Moles","descripcion":null}]}],"pagina":0,"tamano":12,"totalElementos":1,"totalPaginas":1}
```

`GET /categorias` devuelve un arreglo de `{id,nombre,descripcion}` ordenado por nombre e ID. `GET /recetas/{id}` devuelve además `preparacion`, `porcionesSolicitadas`, `ingredientes` y `multimedia`. Ingredientes: `{id,nombre,cantidadBase,cantidadAjustada,unidad,orden,nota}`. Multimedia: `{id,tipo,url,textoAlternativo,orden}`.

Con `GET /recetas/{id}?porciones=2`, `porciones` debe ser un entero de 1–100. Cada cantidad ajustada es `cantidadBase × porciones / porcionesBase`, redondeada a tres decimales HALF_UP sin conversión de unidades. Sin el parámetro, `porcionesSolicitadas` y `cantidadAjustada` son `null`; para `AL_GUSTO` las cantidades siguen siendo `null`. Las URL `example.invalid` de datos demo son ficticias; no representan imágenes disponibles.

## Errores y alcance

- **400**: validación o parámetros inválidos; el registro puede devolver `error` y `campos`.
- **401**: token ausente, inválido, vencido o revocado, o credenciales de login inválidas.
- **403**: usuario autenticado sin autorización; CORS también puede rechazar un origen no admitido.
- **404**: receta inexistente o no visible, sin revelar su estado.
- **409**: correo ya registrado o conflicto optimista de logout.

No están implementados CRUD de recetas, favoritos, moderación ni recuperación de contraseña. No deducir permisos a partir de CORS. Para el contrato completo y datos de prueba, véanse [recetas públicas](RECETAS_PUBLICAS_API.md), [autenticación](AUTENTICACION_API.md) y `backend/datos-demo-local/README.md`. Los campos demo del frontend como región y duración no están en el contrato; necesitarán adaptación, no deben inventarse como datos de la API.
