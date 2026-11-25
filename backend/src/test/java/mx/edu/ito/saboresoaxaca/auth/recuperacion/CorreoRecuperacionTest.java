package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CorreoRecuperacionTest {
    @Test
    void generaAlternativasUtf8ConElMismoEnlaceSinEnviarCorreo() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
        String token = "A".repeat(43);
        String enlace = "https://saboresdeoaxaca.food/restablecer-contrasena#token=" + token;
        MimeMessage mensaje = CorreoRecuperacion.crear(sender, "remitente@ejemplo.invalid", "destino@ejemplo.invalid", token);
        mensaje.saveChanges();
        assertTrue(mensaje.isMimeType("multipart/*"));
        Part alternativa = buscar(mensaje, "multipart/alternative");
        assertNotNull(alternativa);
        String texto = (String) buscar(alternativa, "text/plain").getContent();
        String html = (String) buscar(alternativa, "text/html").getContent();
        assertTrue(texto.contains(enlace));
        assertTrue(html.contains("href=\"" + enlace + "\""));
        assertTrue(html.contains("Restablecer mi contraseña"));
        assertTrue(html.contains("20 minutos"));
        assertTrue(texto.contains("20 minutos"));
        assertTrue(texto.contains("ignorar"));
        assertFalse(html.contains("{{ENLACE}}"));
        assertFalse(html.contains("<script"));
        verify(sender, never()).send(any(MimeMessage.class));
    }

    @Test
    void rechazaTokensConContenidoHtmlOLongitudIncorrecta() {
        JavaMailSender sender = mock(JavaMailSender.class);
        assertThrows(IllegalArgumentException.class, () -> CorreoRecuperacion.crear(sender, "a", "b", "\"><script>"));
        assertThrows(IllegalArgumentException.class, () -> CorreoRecuperacion.crear(sender, "a", "b", "A".repeat(42)));
        verifyNoInteractions(sender);
    }

    private static Part buscar(Part parte, String tipo) throws Exception {
        if (parte.isMimeType(tipo)) return parte;
        if (parte.isMimeType("multipart/*")) {
            Multipart contenido = (Multipart) parte.getContent();
            for (int i = 0; i < contenido.getCount(); i++) {
                Part encontrada = buscar(contenido.getBodyPart(i), tipo);
                if (encontrada != null) return encontrada;
            }
        }
        return null;
    }
}
