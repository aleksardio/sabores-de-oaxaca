# SMS de reportes (Twilio)

Esta integración es **optativa y deshabilitada por defecto**. No depende de Postfix, no modifica el correo y no crea tablas.

## Activación

En el entorno **privado** de Spring Boot (systemd/EnvironmentFile, nunca GitHub), configurar:

```dotenv
SMS_HABILITADO=true
SMS_MODO_PRUEBA=true
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=valor_secreto
TWILIO_SMS_FROM=+1XXXXXXXXXX
SMS_DESTINO=+52XXXXXXXXXX
SMS_INTERVALO_SEGUNDOS=300
```

- `SMS_MODO_PRUEBA=true`: para cuentas **Trial**, el cuerpo se envía como el identificador predefinido `sms_internal_alerts`; Twilio determina el texto final y **no incluye detalles del reporte**. En una cuenta completa puede fijarse `false` para enviar el texto personalizado.
- `TWILIO_SMS_FROM`: en Trial, el número emisor que aparece en **Try out SMS** para ese destinatario; después de actualizar, un número propio habilitado para SMS a México. No todos los números pueden enviar a todos los países. Verificar las reglas actuales.
- `SMS_DESTINO`: teléfono autorizado para recibir avisos, en formato E.164 (México: `+52` y 10 dígitos).
- En cuentas trial de Twilio podrían requerirse números de destinatario previamente verificados y otras restricciones.
- Nunca pegar tokens reales en commits, conversaciones, capturas o comandos con eco.
- El límite de 1 SMS aceptado a la cola por cada 300 segundos es **por instancia**, no distribuido; no es garantía de presupuesto ni de entrega.
- Twilio puede cobrar cada intento; configurar límites y alertas de gasto desde el proveedor.
- Guardar un teléfono real únicamente con autorización del destinatario.

## Disparador

En Trial, el mensaje recibido será el ejemplo de alertas internas que proporciona Twilio, no el texto personalizado de Sabores de Oaxaca.

Al crear correctamente un reporte nuevo mediante `POST /api/v1/recetas/{id}/reportes`, Spring emite `ReporteCreadoEvento`. Un listener `AFTER_COMMIT` agenda un único SMS breve al destinatario configurado. No envía el texto del reporte ni el nombre del reportante. Las peticiones duplicadas que responden 409 no generan un evento nuevo. No se notifica si la transacción falla.

El envío se desacopla del HTTP de reportes: un fallo del proveedor no revierte ni bloquea el registro en MySQL. Las llamadas HTTP a Twilio tienen tiempo límite; el proceso usa una cola acotada en memoria (10 solicitudes) y un trabajador. Si el VPS reinicia, si la cola se satura o si el proveedor falla, el SMS puede perderse: **no existe un reintento persistente**.

Una respuesta 2xx de Twilio solo acredita que el proveedor aceptó la solicitud; confirmar entrega en la consola de Twilio y con el dispositivo destinatario. El listener no expone tokens ni números en logs.

## Prueba controlada

1. Con SMS apagado, crear un reporte nuevo y verificar HTTP 201 y que aparece para moderación. No debe intentar un envío.
2. Configurar credenciales de **prueba autorizadas**, un origen compatible y un destinatario de prueba. Reiniciar el servicio. Verificar que el arranque no informa configuración inválida.
3. Crear **un solo** reporte sobre una receta publicada, con usuario diferente al autor. Esperar HTTP 201. Revisar si Twilio aceptó el envío (sin imprimir credenciales) y confirmar recepción en el teléfono.
4. Intentar reportar de nuevo la misma receta con el mismo usuario: 409 y ningún nuevo SMS.
5. Antes de otro envío, dejar transcurrir el intervalo configurado; evitar pruebas con muchos usuarios porque los SMS pueden generar costos.
6. Desactivar `SMS_HABILITADO` si la integración no se utilizará continuamente.

## Limitaciones y seguridad

No existe consola de administración ni configuración de teléfonos por usuario. La notificación llega a un **único teléfono de administración** configurado en el VPS. No usar un endpoint público para activar el envío. Para un despliegue multiinstancia, presupuestos más estrictos, reintentos duraderos y auditoría de entrega, se necesitarán una cola persistente, controles distribuidos y estados de entrega por webhook verificado.
