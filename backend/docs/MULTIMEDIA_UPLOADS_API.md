# Subida de multimedia

`POST /api/v1/multimedia/uploads` requiere Bearer JWT válido y rol `COCINERO`. Enviar `multipart/form-data` con una parte de archivo llamada `archivo`. No especificar manualmente el boundary de Content-Type. Responde `201`:

```json
{"tipo":"IMAGEN","url":"https://media.ejemplo.com/uploads/3a887af9-6d62-496f-9b98-0835309dce77.jpg","nombreOriginal":"foto.jpg","tamanoBytes":12345}
```

Se aceptan `image/jpeg`, `image/png`, `image/webp` hasta 5 MiB y `video/mp4`, `video/webm` hasta 30 MiB (1 MiB = 1048576 bytes). El MIME declarado debe coincidir con la firma; no se confía en la extensión original. El nombre original es metadato, nunca una ruta; se rechazan separadores y controles. El nombre almacenado es aleatorio. Vacío, nombre, formato o firma inválidos: `400`; sin autenticación: `401`; sin rol: `403`; tamaño excedido: `413`. Errores de configuración o almacenamiento: `500` genérico. Un límite de Nginx puede responder `413` antes de llegar a Spring. La firma solo filtra formatos evidentes: no garantiza que el archivo sea íntegro ni libre de malware o contenido malicioso.

La respuesta aún no modifica ninguna receta. En el JSON de crear o editar, copiar únicamente `tipo` y `url` a un elemento de `multimedia` y proporcionar `orden` y, opcionalmente, `textoAlternativo`; mantener el control de versión existente. La URL es pública en cuanto se sube, incluso para borradores. No subir información privada. No hay borrado automático ni propiedad de archivos; cargas no utilizadas, fallos de guardado de receta y sustituciones generan huérfanos. Establecer una política operativa de retención y revisar referencias en `recetas_multimedia` antes de borrar, considerando borradores, carreras con nuevas referencias y copias de seguridad. No ejecutar limpieza automática sin coordinación.

## Configuración y despliegue

* `APP_UPLOAD_DIR`: ruta absoluta a directorio **ya existente**, persistente, externo al repositorio y a cualquier `dist`, con escritura para la aplicación y lectura para Nginx. No usar un directorio de sistema, compartido con archivos privados ni modificable por usuarios no confiables. Montar un volumen persistente y respaldarlo junto con MySQL; múltiples instancias requieren almacenamiento compartido. La aplicación no sirve archivos locales.
* `APP_UPLOAD_PUBLIC_ORIGIN`: origen HTTPS público, por ejemplo `https://media.ejemplo.com`, sin ruta, barra final, credenciales, consulta ni fragmento. No se aceptan IP literales, localhost ni `.local`. Configurar DNS público y TLS válido; validar operativamente que DNS no apunte a una red privada. Se recomienda un dominio separado sin cookies ni contenido activo de la aplicación.
* `CORS_ALLOWED_ORIGINS`: orígenes exactos del navegador ya admitidos por la aplicación. El preflight de POST con Authorization y Content-Type utiliza la configuración existente.
* Spring limita el archivo a `31457280B` (30 MiB) y la petición a `32505856B` (31 MiB), incluido el overhead multipart; el servicio aplica el límite específico de cada tipo. Con Tomcat embebido se comprobó `413` JSON para un archivo de 30 MiB + 1 byte dentro del límite de petición. Si se excede el límite de la petición completa, el contenedor o Nginx pueden rechazarla antes de consumir el cuerpo y el cliente puede observar un cierre de conexión en vez del JSON. El contenedor puede usar almacenamiento temporal para multipart: dimensionar y proteger también ese espacio. Nginx debe permitir 31 MiB incluyendo overhead y su almacenamiento temporal debe tener capacidad. No imprimir tokens ni archivos en registros.

El directorio final configurado no puede ser un enlace simbólico; las rutas se resuelven antes de escribir y los nombres de destino se generan en el servidor. Los archivos incompletos usan extensión `.part` y se eliminan si falla la copia, salvo errores de limpieza o interrupción abrupta del proceso. El ejemplo Nginx no publica `.part`. La comprobación de ubicación externa depende del directorio de trabajo de la aplicación y no protege frente a cambios concurrentes de directorios o enlaces por un tercero con permisos de escritura: configurar una ruta confiable externa al repositorio y `dist`, cuyos directorios padres no sean modificables por usuarios no confiables.

Ejemplo de preparación en Ubuntu (adaptar usuarios, grupos y volumen a la instalación):

```sh
sudo install -d -o sabores -g www-data -m 0750 /var/lib/sabores/uploads
sudo systemctl edit sabores-api
# Agregar en [Service]:
# Environment="APP_UPLOAD_DIR=/var/lib/sabores/uploads"
# Environment="APP_UPLOAD_PUBLIC_ORIGIN=https://media.ejemplo.com"
sudo systemctl daemon-reload
sudo systemctl restart sabores-api
sudo nginx -t
sudo systemctl reload nginx
```

Ejemplo de bloques Nginx: incluir `client_max_body_size 31m;` en el servidor HTTPS de la API. En un servidor HTTPS separado para `media.ejemplo.com`, con sus certificados ya configurados, usar únicamente una ruta de nombres generados:

```nginx
location ~ ^/uploads/(?<archivo>[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm))$ {
    alias /var/lib/sabores/uploads/$archivo;
    limit_except GET { deny all; }
    add_header X-Content-Type-Options nosniff always;
    add_header Content-Security-Policy "default-src 'none'; sandbox" always;
    autoindex off;
}
location / { return 404; }
```

No habilitar intérpretes, listados, escritura HTTP ni acceso a otros directorios en ese host. Restringir permisos de montaje y endurecer Nginx según la infraestructura. La comprobación de firmas no sustituye un antivirus, transcodificación aislada, cuotas, rate limiting ni revisión del contenido.

## Bruno

Crear POST a `{{baseUrl}}/api/v1/multimedia/uploads`; Auth: Bearer `{{tokenCocinero}}`; Body: Multipart Form, campo **File** `archivo`, seleccionar un JPG, PNG, WebP, MP4 o WebM. Bruno genera Content-Type y boundary. Verificar `201` y abrir la URL solo después de configurar HTTPS y Nginx; sin token debe responder `401` y con otro rol `403`.

## Verificación

Con JDK 17.0.16, `mvnw.cmd clean verify` terminó correctamente: 50 pruebas contabilizadas, 30 ejecutadas y 20 omitidas (19 integraciones MySQL optativas y una prueba de enlace simbólico sin permisos para crearlo en Windows). La prueba HTTP con Tomcat embebido usa autenticación y servicio simulados y verifica el límite de archivo real; no sustituye una prueba del proxy Nginx ni del volumen de producción.
