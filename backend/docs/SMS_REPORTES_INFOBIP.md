# SMS de reportes con Infobip

El SMS es opcional y está deshabilitado por defecto. Un reporte guardado publica
un evento y, solo después del commit, el listener agenda un aviso asíncrono.
El texto incluye únicamente los identificadores de reporte y receta: no incluye
el motivo, nombre, correo ni teléfono de quien reporta. Un fallo de proveedor no
revierte el reporte.

## Configuración privada

Definir en el entorno del backend, nunca en archivos versionados:

- `SMS_HABILITADO=true` para activar; el valor predeterminado es `false`.
- `INFOBIP_BASE_URL`: origen HTTPS asignado por Infobip a la cuenta, por ejemplo
  `https://<cuenta>.api.infobip.com` o un origen regional equivalente. No incluye
  ruta, consulta ni puerto; se aceptan únicamente dominios de API de Infobip.
- `INFOBIP_API_KEY`: clave de API con permiso de envío SMS.
- `INFOBIP_SENDER`: remitente numérico o alfanumérico autorizado para la cuenta y
  el destino; en pruebas puede utilizarse el remitente autorizado por Infobip.
- `SMS_DESTINO`: número autorizado en formato internacional, con o sin `+`;
  el cliente elimina el `+` para la API.
- `SMS_INTERVALO_SEGUNDOS`: intervalo mínimo por instancia (por defecto 300,
  mínimo efectivo 60 segundos).

La configuración se valida al activar la función y no acepta un origen arbitrario
al que pudiera enviarse la clave. El remitente y los destinos permitidos dependen
de la cuenta, del país y de las condiciones Trial. No guardar claves ni números
reales en commits, logs, capturas o comandos públicos.

## Operación y límites

La solicitud JSON usa `POST /sms/3/messages`, `Authorization: App <clave>`,
`sender`, `destinations` y `content.text`. La API puede devolver un estado como
`PENDING_ACCEPTED`: significa aceptación para procesamiento, **no entrega**.
Este servicio registra solo el código HTTP, sin interpretar ni guardar el cuerpo;
una respuesta 2xx tampoco confirma por sí sola aceptación individual o entrega.
La entrega se comprueba separadamente en Infobip o mediante su mecanismo de
reportes; esta aplicación no implementa confirmación de entrega.

La cola en memoria admite diez trabajos y usa un trabajador. Los límites son por
instancia, no distribuidos; si la cola se llena, el proceso se reinicia o falla
la red, se puede perder el aviso. No hay reintentos duraderos. Configurar límites
de gasto en el proveedor. Los logs no incluyen credenciales, encabezados ni
números de teléfono. La configuración previa `TWILIO_*` y `SMS_MODO_PRUEBA`
ya no se utiliza; al migrar revisar variables privadas antes de habilitar SMS.

La documentación oficial del contrato está en [Infobip: Send SMS message](https://www.infobip.com/docs/api/channels/sms/outbound-sms/send-message/send-sms-messages).
Las pruebas automatizadas de este repositorio usan HTTP simulado, no envían SMS.
