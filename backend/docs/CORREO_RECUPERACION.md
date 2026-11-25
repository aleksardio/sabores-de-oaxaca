# Correo de recuperación: revisión y despliegue

La plantilla `src/main/resources/templates/correo-recuperacion.html` se incluye en el JAR. `CorreoRecuperacion` compone el texto plano y el HTML UTF-8 como alternativas MIME, sin imágenes ni fuentes externas; usa las fuentes instaladas o Georgia/Arial. El token se valida como Base64URL de 43 caracteres y el enlace se escapa para HTML. No se envían mensajes durante las pruebas automáticas.

## Vista previa local

Desde la raíz, generar una copia temporal con un token **ficticio**; no abrirla con un token real ni pulsar el enlace contra una cuenta real:

```powershell
$html = Get-Content -Raw -Encoding utf8 backend/src/main/resources/templates/correo-recuperacion.html
$destino = Join-Path $env:TEMP 'sabores-correo-preview.html'
$enlace = 'https://saboresdeoaxaca.food/restablecer-contrasena#token=' + ('A' * 43)
[System.IO.File]::WriteAllText($destino, $html.Replace('{{ENLACE}}', $enlace), [System.Text.UTF8Encoding]::new($false))
```

Abrir el archivo local en el navegador: es una aproximación, no una prueba de Gmail, Outlook o Apple Mail. Probar con anchos de escritorio y móvil. El enlace no representa una recuperación válida.

## Preparación del despliegue

Tras revisar y aprobar el PR, compilar con Java 17 mediante `./mvnw clean verify` desde `backend/` y seguir el procedimiento autorizado de publicación y reversión del servicio. No ejecutar migraciones ni cambiar credenciales, Nginx, Postfix o SMTP como parte de este cambio. Mantener la configuración y el remitente ya autorizados; el indicador `RECUPERACION_HABILITADA` sigue siendo una decisión operativa explícita. Consultar [contrato de recuperación](RECUPERACION_CONTRASENA_API.md).

Antes de habilitar o validar con un destinatario controlado, comprobar con el equipo responsable que **el relay y cualquier proveedor intermedio no reescriban enlaces, no activen seguimiento de clics ni extraigan fragmentos**. El código entrega directamente el enlace original, pero no puede imponer esa política a sistemas externos. Tampoco registrar contenido del correo, enlaces ni tokens en el relay, proxy, herramientas de soporte o capturas. No habilitar depuración SMTP. Si no se puede garantizar el tratamiento seguro del enlace, no habilitar la función hasta resolverlo.

Después del despliegue autorizado, usar únicamente una cuenta de prueba controlada y comprobar recepción en texto plano y HTML, remitente, caracteres, botón y enlace alternativo en Gmail, Outlook, Apple Mail y móvil. Verificar en privado que el destino conserva exactamente `#token=` sin reescritura y que el enlace funciona una sola vez durante su vigencia, sin copiar el token a registros ni informes. Confirmar que una contraseña cambiada invalida sesiones anteriores. No interpretar aceptación SMTP como entrega efectiva. Ante fallo, seguir el procedimiento de reversión del servicio y deshabilitar recuperación si corresponde, sin modificar datos productivos manualmente.
