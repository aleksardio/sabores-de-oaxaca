package mx.edu.ito.saboresoaxaca.auth.google;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GoogleIdTokenValidatorTest {
    private static final String CLIENTE =
        "123456789-prueba.apps.googleusercontent.com";

    private Jwt crear(
            String emisor,
            List<String> audiencias,
            String azp,
            boolean correoVerificado,
            Instant emitido) {

        var builder = Jwt.withTokenValue("simulado")
            .header("alg", "RS256")
            .subject("google-sub-prueba")
            .issuer(emisor)
            .audience(audiencias)
            .issuedAt(emitido)
            .expiresAt(emitido.plusSeconds(300))
            .claim("email", "ana@ejemplo.com")
            .claim("email_verified", correoVerificado);

        if (azp != null) builder.claim("azp", azp);

        return builder.build();
    }

    @Test
    void aceptaClaimsCorrectos() {
        var token = crear(
            "https://accounts.google.com",
            List.of(CLIENTE),
            null, true, Instant.now().minusSeconds(30));

        assertFalse(
            GoogleIdTokenValidator
                .validarClaims(token, CLIENTE).hasErrors()
        );
    }

    @Test
    void rechazaEmisorFalso() {
        var token = crear(
            "https://otro-proveedor.example",
            List.of(CLIENTE),
            null, true, Instant.now());

        assertTrue(
            GoogleIdTokenValidator
                .validarClaims(token, CLIENTE).hasErrors()
        );
    }

    @Test
    void rechazaAudienciaDeOtraAplicacion() {
        var token = crear(
            "https://accounts.google.com",
            List.of("cliente-ajeno"),
            null, true, Instant.now());

        assertTrue(
            GoogleIdTokenValidator
                .validarClaims(token, CLIENTE).hasErrors()
        );
    }

    @Test
    void rechazaAzpDiferente() {
        var token = crear(
            "https://accounts.google.com",
            List.of(CLIENTE),
            "cliente-ajeno", true, Instant.now());

        assertTrue(
            GoogleIdTokenValidator
                .validarClaims(token, CLIENTE).hasErrors()
        );
    }

    @Test
    void rechazaCorreoNoVerificado() {
        var token = crear(
            "https://accounts.google.com",
            List.of(CLIENTE),
            null, false, Instant.now());

        assertTrue(
            GoogleIdTokenValidator
                .validarClaims(token, CLIENTE).hasErrors()
        );
    }

    @Test
    void rechazaFechaDeEmisionFutura() {
        var token = crear(
            "https://accounts.google.com",
            List.of(CLIENTE),
            null, true, Instant.now().plusSeconds(3600));

        assertTrue(
            GoogleIdTokenValidator
                .validarClaims(token, CLIENTE).hasErrors()
        );
    }

    @Test
    void exigeAzpConMultiplesAudiencias() {
        var token = crear(
            "https://accounts.google.com",
            List.of(CLIENTE, "otro-cliente"),
            null, true, Instant.now());

        assertTrue(
            GoogleIdTokenValidator
                .validarClaims(token, CLIENTE).hasErrors()
        );
    }
}
