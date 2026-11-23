package mx.edu.ito.saboresoaxaca;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;

class CorsConfiguracionTest {
    @Test
    void configuracionExplicitaEsRestrictiva() {
        var request = new MockHttpServletRequest("GET", "/api/v1/recetas");
        var config = new SecurityConfig().corsConfigurationSource("https://web.ejemplo.invalid,http://localhost:5173").getCorsConfiguration(request);
        assertNotNull(config);
        assertEquals("https://web.ejemplo.invalid", config.checkOrigin("https://web.ejemplo.invalid"));
        assertNull(config.checkOrigin("https://atacante.invalid"));
        assertFalse(config.getAllowCredentials());
        assertNull(config.checkHttpMethod(org.springframework.http.HttpMethod.PUT));
        assertNull(config.checkHeaders(java.util.List.of("X-No-Permitido")));
        var sinOrigenes = new SecurityConfig().corsConfigurationSource("").getCorsConfiguration(request);
        assertNotNull(sinOrigenes);
        assertNull(sinOrigenes.checkOrigin("http://localhost:5173"));
    }

    @Test
    void rechazaComodinesYRutas() {
        assertThrows(IllegalStateException.class, () -> new SecurityConfig().corsConfigurationSource("*"));
        assertThrows(IllegalStateException.class, () -> new SecurityConfig().corsConfigurationSource("https://ejemplo.invalid/ruta"));
    }
}
