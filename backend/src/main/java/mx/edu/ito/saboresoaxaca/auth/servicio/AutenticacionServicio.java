package mx.edu.ito.saboresoaxaca.auth.servicio;

import mx.edu.ito.saboresoaxaca.auth.dto.*;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRolRepositorio;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

@Service
@Profile("!bootstrap")
public class AutenticacionServicio {
    private final UsuarioRepositorio usuarios;
    private final UsuarioRolRepositorio roles;
    private final PasswordEncoder encoder;
    private final JwtEncoder jwt;
    private final String emisor, audiencia;
    private final long duracion;
    private final String hashFicticio;

    public AutenticacionServicio(UsuarioRepositorio usuarios, UsuarioRolRepositorio roles, PasswordEncoder encoder, JwtEncoder jwt,
            @Value("${JWT_ISSUER:sabores-oaxaca-api}") String emisor,
            @Value("${JWT_AUDIENCE:sabores-oaxaca-web}") String audiencia,
            @Value("${JWT_TTL_SECONDS:1800}") long duracion) {
        if (duracion <= 0 || duracion > 86400) throw new IllegalStateException("JWT_TTL_SECONDS debe estar entre 1 y 86400");
        this.usuarios = usuarios; this.roles = roles; this.encoder = encoder; this.jwt = jwt;
        this.emisor = emisor; this.audiencia = audiencia; this.duracion = duracion;
        this.hashFicticio = encoder.encode("no-es-una-contrasena-de-usuario");
    }

    @Transactional(readOnly = true)
    public LoginRespuesta login(LoginSolicitud solicitud) {
        Usuario usuario = usuarios.findByCorreo(solicitud.getCorreo()).orElse(null);
        boolean coincide = encoder.matches(solicitud.getContrasena(), usuario == null ? hashFicticio : usuario.getContrasenaHash());
        if (usuario == null || !coincide || usuario.getEliminadoEn() != null) throw new BadCredentialsException("Credenciales inválidas");
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(emisor).audience(List.of(audiencia)).subject(usuario.getId().toString())
                .issuedAt(ahora).expiresAt(ahora.plusSeconds(duracion)).claim("version_tokens", usuario.getVersionTokens()).build();
        String token = jwt.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginRespuesta(token, "Bearer", duracion);
    }


    public LoginRespuesta emitirSesion(Usuario usuario) {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(emisor)
                .audience(List.of(audiencia))
                .subject(usuario.getId().toString())
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(duracion))
                .claim("version_tokens", usuario.getVersionTokens())
                .build();

        String token = jwt.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        return new LoginRespuesta(token, "Bearer", duracion);
    }

    @Transactional(readOnly = true)
    public PerfilRespuesta perfil(Jwt token) {
        long id;
        try { id = Long.parseLong(token.getSubject()); } catch (RuntimeException e) { throw new BadCredentialsException("Token inválido"); }
        Usuario usuario = usuarios.findById(id).orElseThrow(() -> new BadCredentialsException("Token inválido"));
        Object version = token.getClaims().get("version_tokens");
        if (usuario.getEliminadoEn() != null || !(version instanceof Number n) || n.longValue() != usuario.getVersionTokens())
            throw new BadCredentialsException("Token inválido");
        List<String> codigos = roles.findByUsuario_Id(id).stream().map(asignacion -> asignacion.getRol().getCodigo()).sorted().toList();
        return new PerfilRespuesta(id, usuario.getNombreVisible(), usuario.getCorreo(), codigos);
    }

    @Transactional
    public void logout(Jwt token) {
        long id;
        try { id = Long.parseLong(token.getSubject()); }
        catch (RuntimeException error) { throw new BadCredentialsException("Token inválido"); }
        Object version = token.getClaims().get("version_tokens");
        Usuario usuario = usuarios.findById(id).orElseThrow(() -> new BadCredentialsException("Token inválido"));
        if (!(version instanceof Number n) || usuario.getEliminadoEn() != null || n.longValue() != usuario.getVersionTokens())
            throw new BadCredentialsException("Token inválido");
        if (usuarios.invalidarTokens(id, ((Number) version).longValue(), usuario.getVersionPerfil()) != 1)
            throw new OptimisticLockingFailureException("La cuenta cambió durante la operación");
    }
}
