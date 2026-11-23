package mx.edu.ito.saboresoaxaca.auth.configuracion;

import org.junit.jupiter.api.Test;
import java.security.SecureRandom;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;

class JwtConfiguracionTest {
    private final JwtConfiguracion configuracion = new JwtConfiguracion();

    @Test
    void exigeBase64YLongitudAdecuada() {
        assertThrows(IllegalStateException.class, () -> configuracion.jwtClave(""));
        assertThrows(IllegalStateException.class, () -> configuracion.jwtClave("no es base64!"));
        assertThrows(IllegalStateException.class, () -> configuracion.jwtClave(Base64.getEncoder().encodeToString(new byte[31])));
        assertThrows(IllegalStateException.class, () -> configuracion.jwtClave(Base64.getEncoder().encodeToString(new byte[32])));
        byte[] clave = new byte[32];
        new SecureRandom().nextBytes(clave);
        assertArrayEquals(clave, configuracion.jwtClave(Base64.getEncoder().encodeToString(clave)).getEncoded());
    }
}
