package mx.edu.ito.saboresoaxaca.auth.google;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
@Profile("!bootstrap")
public class GoogleIdTokenValidator {
    public record Identidad(String sub, String correo, String nombre) {}

    private final JwtDecoder decoder;

    public GoogleIdTokenValidator(
            @Value("${GOOGLE_CLIENT_ID:}") String clientId) {
        clientId = clientId.trim();

        if (clientId.isEmpty()) {
            decoder = null;
            return;
        }
        if (!clientId.endsWith(".apps.googleusercontent.com")) {
            throw new IllegalStateException("GOOGLE_CLIENT_ID invalido");
        }

        final String audiencia = clientId;

        NimbusJwtDecoder google = NimbusJwtDecoder
            .withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
            .build();

        google.setJwtValidator(
            new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                jwt -> validarClaims(jwt, audiencia)
            )
        );

        decoder = google;
    }

    static OAuth2TokenValidatorResult validarClaims(
            Jwt jwt, String audiencia) {

        String emisor = jwt.getIssuer() == null
            ? "" : jwt.getIssuer().toString();

        String azp = jwt.getClaimAsString("azp");
        List<String> audiencias = jwt.getAudience();

        boolean audienciaValida = audiencias != null
            && audiencias.contains(audiencia)
            && (audiencias.size() == 1
                ? azp == null || azp.equals(audiencia)
                : audiencia.equals(azp));

        boolean valido =
            List.of("https://accounts.google.com",
                    "accounts.google.com").contains(emisor)
            && audienciaValida
            && jwt.getIssuedAt() != null
            && !jwt.getIssuedAt().isAfter(
                Instant.now().plusSeconds(60))
            && Boolean.TRUE.equals(
                jwt.getClaim("email_verified"));

        return valido
            ? OAuth2TokenValidatorResult.success()
            : OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token"));
    }

    public Identidad validar(String credencial) {
        if (decoder == null) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Inicio de sesion con Google no configurado");
        }

        if (credencial == null || credencial.isBlank()
                || credencial.length() > 8192) {
            throw invalido();
        }

        try {
            Jwt jwt = decoder.decode(credencial);

            String sub = jwt.getSubject();
            String correo = jwt.getClaimAsString("email");
            String nombre = jwt.getClaimAsString("name");

            if (sub == null || sub.isBlank() || sub.length() > 255
                    || correo == null || correo.length() > 254
                    || !correo.matches("[^@\\s]+@[^@\\s]+")
                    || nombre == null || nombre.isBlank()) {
                throw invalido();
            }

            nombre = nombre.strip();
            if (nombre.length() > 100) {
                nombre = nombre.substring(0, 100);
            }

            return new Identidad(
                sub, correo.toLowerCase(Locale.ROOT), nombre);

        } catch (JwtException error) {
            throw invalido();
        }
    }

    private static ResponseStatusException invalido() {
        return new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "Credencial Google invalida");
    }
}
