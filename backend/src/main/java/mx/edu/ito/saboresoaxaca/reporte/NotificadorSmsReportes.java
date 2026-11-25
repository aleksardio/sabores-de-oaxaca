package mx.edu.ito.saboresoaxaca.reporte;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * Notificación SMS al teléfono autorizado del administrador.
 * Apagada por defecto, acotada a una instancia y desacoplada de la transacción.
 * No envía nombres, motivos ni información personal de quien reporta.
 */
@Service
@Profile("!bootstrap")
public class NotificadorSmsReportes {
    private static final Logger LOG = LoggerFactory.getLogger(NotificadorSmsReportes.class);
    private final boolean habilitado;
    private final boolean modoPrueba;
    private final String cuentaSid;
    private final String token;
    private final String origen;
    private final String destino;
    private final long intervaloNanos;
    private long ultimoAceptadoNanos;
    private boolean tieneUltimo;
    private final HttpClient cliente = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build();
    private final ThreadPoolExecutor cola = new ThreadPoolExecutor(
            1, 1, 0, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(10), trabajo -> {
        Thread hilo = new Thread(trabajo, "sms-reportes");
        hilo.setDaemon(true);
        return hilo;
    });

    public NotificadorSmsReportes(
            @Value("${app.sms.habilitado:false}") boolean habilitado,
            @Value("${app.sms.modo-prueba:false}") boolean modoPrueba,
            @Value("${app.sms.twilio.account-sid:}") String cuentaSid,
            @Value("${app.sms.twilio.auth-token:}") String token,
            @Value("${app.sms.twilio.from:}") String origen,
            @Value("${app.sms.destino:}") String destino,
            @Value("${app.sms.intervalo-segundos:300}") long intervaloSegundos) {
        this.habilitado = habilitado;
        this.modoPrueba = modoPrueba;
        this.cuentaSid = cuentaSid.strip();
        this.token = token.strip();
        this.origen = origen.strip();
        this.destino = destino.strip();
        this.intervaloNanos = TimeUnit.SECONDS.toNanos(Math.max(60, intervaloSegundos));
        if (habilitado && (!this.cuentaSid.matches("AC[0-9a-fA-F]{32}")
                || this.token.isBlank() || !telefonoE164(this.origen) || !telefonoE164(this.destino))) {
            throw new IllegalStateException("Configuración SMS incompleta o inválida; revisar variables del entorno.");
        }
    }

    private static boolean telefonoE164(String telefono) {
        return telefono.matches("\\+[1-9][0-9]{7,14}");
    }

    /** Solo se agenda cuando MySQL confirma el nuevo reporte. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public synchronized void alCrearReporte(ReporteCreadoEvento evento) {
        if (!habilitado) return;
        long ahora = System.nanoTime();
        if (tieneUltimo && ahora - ultimoAceptadoNanos < intervaloNanos) {
            LOG.info("SMS omitido por intervalo de protección entre notificaciones");
            return;
        }
        try {
            cola.execute(() -> enviar(evento));
            ultimoAceptadoNanos = ahora;
            tieneUltimo = true;
        } catch (RejectedExecutionException ex) {
            LOG.warn("Cola de notificaciones SMS llena o cerrada");
        }
    }

    private void enviar(ReporteCreadoEvento evento) {
        try {
            // Una cuenta Twilio Trial solo admite identificadores de plantillas predefinidas.
            String cuerpo = modoPrueba ? "sms_internal_alerts"
                    : "Sabores de Oaxaca: nuevo reporte #" + evento.reporteId()
                    + " de receta #" + evento.recetaId() + ". Revisa el panel de moderacion.";
            String formulario = campo("To", destino) + "&" + campo("From", origen) + "&" + campo("Body", cuerpo);
            String credenciales = cuentaSid + ":" + token;
            String autenticacion = Base64.getEncoder().encodeToString(credenciales.getBytes(StandardCharsets.UTF_8));
            HttpRequest solicitud = HttpRequest.newBuilder(
                            URI.create("https://api.twilio.com/2010-04-01/Accounts/" + cuentaSid + "/Messages.json"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Basic " + autenticacion)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formulario))
                    .build();
            HttpResponse<Void> respuesta = cliente.send(solicitud, HttpResponse.BodyHandlers.discarding());
            if (respuesta.statusCode() >= 200 && respuesta.statusCode() < 300) {
                LOG.info("Solicitud de SMS aceptada por proveedor para el reporte {}", evento.reporteId());
            } else {
                LOG.warn("Twilio rechazó la solicitud SMS con HTTP {}", respuesta.statusCode());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            LOG.warn("Solicitud SMS interrumpida");
        } catch (Exception ex) {
            LOG.warn("No se pudo contactar con el proveedor SMS: {}", ex.getClass().getSimpleName());
        }
    }

    private static String campo(String nombre, String valor) {
        return URLEncoder.encode(nombre, StandardCharsets.UTF_8) + "="
                + URLEncoder.encode(valor, StandardCharsets.UTF_8);
    }

    @PreDestroy
    public void cerrar() { cola.shutdown(); }
}
