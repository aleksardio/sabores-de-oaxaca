package mx.edu.ito.saboresoaxaca.auth.configuracion;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Configuration
@Profile("!bootstrap")
public class JwtConfiguracion {
    @Bean
    SecretKey jwtClave(@Value("${JWT_SECRET_BASE64:}") String secreto) {
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(secreto); }
        catch (IllegalArgumentException error) { throw new IllegalStateException("JWT_SECRET_BASE64 debe ser Base64 válido"); }
        if (bytes.length < 32) throw new IllegalStateException("JWT_SECRET_BASE64 requiere al menos 32 bytes aleatorios");
        boolean iguales = true;
        for (byte b : bytes) if (b != bytes[0]) { iguales = false; break; }
        if (iguales) throw new IllegalStateException("JWT_SECRET_BASE64 no es una clave adecuada");
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey clave) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(clave));
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey clave, @Value("${JWT_ISSUER:sabores-oaxaca-api}") String emisor,
                          @Value("${JWT_AUDIENCE:sabores-oaxaca-web}") String audiencia) {
        if (emisor.isBlank() || audiencia.isBlank()) throw new IllegalStateException("JWT_ISSUER y JWT_AUDIENCE no deben estar vacíos");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(clave).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> claims = jwt -> {
            Object version = jwt.getClaims().get("version_tokens");
            boolean versionValida = version instanceof Integer || version instanceof Long;
            boolean valido = jwt.getAudience() != null && jwt.getAudience().contains(audiencia)
                    && jwt.getExpiresAt() != null && jwt.getIssuedAt() != null
                    && jwt.getExpiresAt().isAfter(jwt.getIssuedAt())
                    && !jwt.getIssuedAt().isAfter(Instant.now()) && jwt.getSubject() != null
                    && jwt.getSubject().matches("[1-9][0-9]{0,18}") && versionValida
                    && ((Number) version).longValue() >= 0;
            return valido ? OAuth2TokenValidatorResult.success() : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(Duration.ZERO), new JwtIssuerValidator(emisor), claims));
        return decoder;
    }
}
