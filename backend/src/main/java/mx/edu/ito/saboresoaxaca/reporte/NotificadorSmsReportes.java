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
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.json.JsonMapper;
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
    private final URI endpoint;
    private final String apiKey;
    private final String origen;
    private final String destino;
    private final long intervaloNanos;
    private long ultimoAceptadoNanos;
    private boolean tieneUltimo;
    private final HttpClient cliente;
    private final JsonMapper json = new JsonMapper();
    private final ThreadPoolExecutor cola = new ThreadPoolExecutor(
            1, 1, 0, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(10), trabajo -> {
        Thread hilo = new Thread(trabajo, "sms-reportes");
        hilo.setDaemon(true);
        return hilo;
    });

    @org.springframework.beans.factory.annotation.Autowired
    public NotificadorSmsReportes(
            @Value("${app.sms.habilitado:false}") boolean habilitado,
            @Value("${app.sms.infobip.base-url:}") String baseUrl,
            @Value("${app.sms.infobip.api-key:}") String apiKey,
            @Value("${app.sms.infobip.sender:}") String origen,
            @Value("${app.sms.destino:}") String destino,
            @Value("${app.sms.intervalo-segundos:300}") long intervaloSegundos) {
        this(habilitado, baseUrl, apiKey, origen, destino, intervaloSegundos,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build());
    }

    NotificadorSmsReportes(boolean habilitado, String baseUrl, String apiKey, String origen,
                           String destino, long intervaloSegundos, HttpClient cliente) {
        this.habilitado = habilitado;
        this.cliente = cliente;
        this.apiKey = apiKey.strip();
        this.origen = origen.strip();
        this.destino = destino.strip();
        this.intervaloNanos = TimeUnit.SECONDS.toNanos(Math.max(60, intervaloSegundos));
        URI base = null;
        try { if (!baseUrl.isBlank()) base = URI.create(baseUrl.strip()); }
        catch (IllegalArgumentException ex) { if (habilitado) throw configuracionInvalida(); }
        if (habilitado && (!baseValida(base) || !this.apiKey.matches("[\\x21-\\x7E]+")
                || !this.origen.matches("[a-zA-Z0-9]{1,16}") || !telefonoInternacional(this.destino))) {
            throw configuracionInvalida();
        }
        this.endpoint = base == null || !baseValida(base) ? null : base.resolve("/sms/3/messages");
    }

    private static IllegalStateException configuracionInvalida() {
        return new IllegalStateException("Configuración SMS incompleta o inválida; revisar variables del entorno.");
    }
    private static boolean baseValida(URI base) {
        return base != null && "https".equalsIgnoreCase(base.getScheme()) && base.getHost() != null
                && base.getHost().toLowerCase(java.util.Locale.ROOT).matches("[a-z0-9-]+\\.api(?:-[a-z0-9-]+)?\\.infobip\\.com")
                && base.getUserInfo() == null && base.getPort() == -1 && base.getQuery() == null && base.getFragment() == null
                && (base.getPath().isEmpty() || "/".equals(base.getPath()));
    }
    private static boolean telefonoInternacional(String telefono) {
        return telefono.matches("\\+?[1-9][0-9]{7,14}");
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
            String cuerpo = "Sabores de Oaxaca: nuevo reporte #" + evento.reporteId()
                    + " de receta #" + evento.recetaId() + ". Revisa el panel de moderacion.";
            String payload = json.writeValueAsString(Map.of("messages", List.of(Map.of(
                    "sender", origen, "destinations", List.of(Map.of("to", destino.replaceFirst("^\\+", ""))),
                    "content", Map.of("text", cuerpo)))));
            HttpRequest solicitud = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "App " + apiKey)
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<Void> respuesta = cliente.send(solicitud, HttpResponse.BodyHandlers.discarding());
            if (respuesta.statusCode() >= 200 && respuesta.statusCode() < 300) {
                LOG.info("Infobip respondió HTTP {} para el reporte {}; la entrega no está confirmada", respuesta.statusCode(), evento.reporteId());
            } else {
                LOG.warn("Infobip rechazó la solicitud SMS con HTTP {}", respuesta.statusCode());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            LOG.warn("Solicitud SMS interrumpida");
        } catch (Exception ex) {
            LOG.warn("No se pudo contactar con el proveedor SMS: {}", ex.getClass().getSimpleName());
        }
    }

    @PreDestroy
    public void cerrar() { cola.shutdown(); }
}
