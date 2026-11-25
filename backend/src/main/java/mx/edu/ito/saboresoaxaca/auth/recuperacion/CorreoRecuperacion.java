package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Composición del correo; no gestiona tokens ni transporte SMTP. */
final class CorreoRecuperacion {
    private static final String BASE = "https://saboresdeoaxaca.food/restablecer-contrasena#token=";
    private static final String PLANTILLA = cargarPlantilla();

    private CorreoRecuperacion() { }

    static MimeMessage crear(JavaMailSender mail, String remitente, String destino, String token) throws MessagingException {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) {
            throw new IllegalArgumentException("Token de recuperación inválido");
        }
        String enlace = BASE + token;
        String texto = "Recupera el acceso a tu cuenta\n\nRecibimos una solicitud para restablecer tu contraseña. "
                + "Abre este enlace para elegir una nueva contraseña:\n" + enlace
                + "\n\nEl enlace vence en 20 minutos. Si no solicitaste el cambio, puedes ignorar este mensaje."
                + "\n\nSabores de Oaxaca · Cultura que vive en cada mesa\nhttps://saboresdeoaxaca.food\nMensaje automático; no respondas a este correo.";
        MimeMessage mensaje = mail.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, StandardCharsets.UTF_8.name());
        helper.setFrom(remitente);
        helper.setTo(destino);
        helper.setSubject("Recuperación de contraseña");
        helper.setText(texto, PLANTILLA.replace("{{ENLACE}}", HtmlUtils.htmlEscape(enlace, StandardCharsets.UTF_8.name())));
        return mensaje;
    }

    private static String cargarPlantilla() {
        try (var entrada = new ClassPathResource("templates/correo-recuperacion.html").getInputStream()) {
            return new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo cargar la plantilla de recuperación", e);
        }
    }
}
