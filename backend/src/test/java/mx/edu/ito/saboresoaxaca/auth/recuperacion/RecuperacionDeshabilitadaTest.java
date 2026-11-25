package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RecuperacionDeshabilitadaTest {
    @Test void deshabilitadoOMitenteAusenteNoAccedeABaseNiEnviaCorreo() {
        EntityManager em=mock(EntityManager.class); var tx=mock(PlatformTransactionManager.class);
        var encoder=mock(PasswordEncoder.class); var correo=mock(JavaMailSender.class);
        for (var servicio : java.util.List.of(new RecuperacionServicio(em,tx,encoder,correo,"prueba@ejemplo.invalid",false), new RecuperacionServicio(em,tx,encoder,correo," ",true))) {
            for (String cuenta : java.util.List.of("existe@ejemplo.invalid","noexiste@ejemplo.invalid")) {
                var error=assertThrows(ResponseStatusException.class,()->servicio.solicitar(cuenta));
                assertEquals(503,error.getStatusCode().value());
            }
            assertEquals(503,assertThrows(ResponseStatusException.class,()->servicio.restablecer("token","contrasena")).getStatusCode().value());
            servicio.cerrar();
        }
        verifyNoInteractions(em,tx,encoder,correo);
    }
}
