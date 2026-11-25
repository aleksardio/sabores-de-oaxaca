# Recuperación de contraseña

Ambas rutas son públicas y reciben JSON. No registrar cuerpos, enlaces ni tokens en proxies, observabilidad o herramientas de soporte.

## Solicitar

`POST /api/v1/auth/recuperar-contrasena`

```json
{"correo":"persona@ejemplo.com"}
```

Con correo válido, `200` tanto para cuentas existentes como inexistentes o desactivadas:

```json
{"mensaje":"Si la cuenta existe, recibirá instrucciones de recuperación"}
```

Mientras la recuperación esté deshabilitada, ambas rutas devuelven `503 {"error":"Recuperación temporalmente no disponible"}` para solicitudes válidas, independientemente de la cuenta. Los datos que no superen Bean Validation siguen devolviendo `400`. La deshabilitación impide crear nuevos tokens y también impide usar temporalmente los ya existentes; no los elimina ni prolonga su vencimiento.

La respuesta no confirma que se haya enviado o entregado un correo. La solicitud se procesa en una cola local en memoria; saturación, reinicio, fallo SMTP o falta de configuración pueden impedir la entrega. No hay reintento duradero. Para una cuenta activa se usa un token aleatorio de 32 bytes, válido 20 minutos, y solo se guarda SHA-256 en V4; se invalidan los anteriores. No se procesan solicitudes de la misma cuenta con menos de un minuto de separación. El enlace usa `/restablecer-contrasena#token=...`: el fragmento no se envía automáticamente en la petición HTTP inicial. El frontend dispone de una pantalla para leerlo y retirarlo de la barra de direcciones; la entrega efectiva depende del entorno.

## Restablecer

`POST /api/v1/auth/restablecer-contrasena`

```json
{"token":"TOKEN_RECIBIDO_EN_EL_FRAGMENTO","contrasena":"NuevaClave1!"}
```

El token real tiene 43 caracteres Base64URL. La contraseña sigue las reglas de registro: 8–72 caracteres, máximo 72 bytes UTF-8, una mayúscula, un número y un carácter especial. En éxito `200 {"mensaje":"Contraseña actualizada"}`; enlace inválido, usado, invalidado o vencido: `400 {"error":"Enlace inválido o vencido"}`. Entradas inválidas también dan `400`. El consumo, BCrypt, invalidación de los demás tokens y aumento de `version_tokens` son transaccionales; los JWT anteriores dejan de ser válidos. Dos intentos simultáneos no pueden consumir el mismo token.

## Abuso y despliegue

Ambas rutas comparten un límite local de 10 solicitudes por IP y minuto, y 300 por instancia y minuto; al excederlo se devuelve `429`. Por defecto se usa `getRemoteAddr` y se ignoran los encabezados; detrás de Nginx eso agruparía a todos sus clientes. Para evitarlo, configurar `RECUPERACION_PROXY_CONFIABLE` con la **IP literal exacta** desde la que Nginx conecta al backend. Solo si la conexión procede de esa IP se acepta un único `X-Real-IP` literal; si falta o es inválido se responde `400`. `X-Forwarded-For` se ignora. Nginx debe **sobrescribir** `X-Real-IP` con la dirección real, por ejemplo `proxy_set_header X-Real-IP $remote_addr;`, nunca reenviar el valor recibido del cliente. Si existe otro balanceador delante de Nginx, configurar su identidad real solo desde rangos confiables antes de usar `$remote_addr`. Mantener el backend inaccesible directamente desde Internet, restringir quién puede conectarse con la IP de proxy configurada y desactivar cualquier procesamiento adicional de cabeceras reenviadas en Spring/Tomcat (`server.forward-headers-strategy=none`), para que `getRemoteAddr` siga siendo el par real. Si estas garantías no pueden establecerse, no configurar el proxy confiable; aplicar límites por IP en el proxy de confianza y mantener el límite global y por cuenta del backend.

La cuenta tiene además un intervalo de un minuto entre correos. El límite en memoria no es distribuido, se reinicia con el proceso y el global puede agotar capacidad para todos. Antes de producción, configurar límites por IP y globales compartidos en el proxy. Ataques distribuidos y saturación de la cola aún pueden impedir la entrega; monitorizar el servicio y diseñar una cola persistente y controles compartidos para múltiples instancias.

La implementación utiliza `JavaMailSender` real, sin modo simulado de producción. Variables externas:

* `SMTP_HOST` y `SMTP_PORT`: por defecto `127.0.0.1` y `25`, compatibles con un relay local ya configurado.
* `SMTP_USERNAME`, `SMTP_PASSWORD`: credenciales externas si el relay las requiere; no guardarlas en Git.
* `SMTP_AUTH` y `SMTP_STARTTLS`: `true` o `false`, según el relay. Cuando `SMTP_STARTTLS=true`, TLS es obligatorio; para un relay remoto usar TLS verificado y no transmitir credenciales en texto claro. Los timeouts de conexión, lectura y escritura son de 5 segundos.
* `RECUPERACION_REMITENTE`: remitente configurado en el relay. Si falta, no se envía correo.
* `RECUPERACION_HABILITADA`: por defecto `false`. Activar explícitamente con `true` solo tras verificar el relay, el remitente, la entrega y los controles de proxy. Si el remitente está vacío, permanece deshabilitada incluso con `true`. El indicador no comprueba conectividad SMTP automáticamente: si el relay falla después de habilitarlo, puede almacenarse un token sin entregar; deshabilitar la función ante una incidencia y supervisar el transporte.

La salida SMTP del VPS de DigitalOcean está restringida. La aceptación por un relay local no demuestra la entrega a Gmail ni a ningún destinatario; comprobar el transporte real con el proveedor autorizado. No habilitar depuración SMTP ni registrar mensajes, enlaces o tokens. La aplicación no instala ni configura Postfix.

## Bruno

Crear POST JSON a `{{baseUrl}}/api/v1/auth/recuperar-contrasena` sin Bearer, con el correo de prueba. Solo en un entorno de pruebas controlado, obtener el token del correo entregado y enviar POST JSON a `/api/v1/auth/restablecer-contrasena`. Comprobar que el mismo token no puede volver a usarse y que el JWT anterior responde `401`. No guardar tokens reales en colecciones compartidas.
