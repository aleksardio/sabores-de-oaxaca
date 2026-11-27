package mx.edu.ito.saboresoaxaca.auth.google;

import jakarta.persistence.EntityManager;
import mx.edu.ito.saboresoaxaca.auth.dto.LoginRespuesta;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import mx.edu.ito.saboresoaxaca.usuario.entidad.*;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.*;

import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;

@Service
@Profile("!bootstrap")
public class GoogleAuthServicio {
    private final GoogleIdTokenValidator validador;
    private final EntityManager em;
    private final UsuarioRepositorio usuarios;
    private final RolRepositorio roles;
    private final UsuarioRolRepositorio asignaciones;
    private final PasswordEncoder encoder;
    private final AutenticacionServicio autenticacion;
    private final SecureRandom aleatorio = new SecureRandom();

    public GoogleAuthServicio(
            GoogleIdTokenValidator validador,
            EntityManager em,
            UsuarioRepositorio usuarios,
            RolRepositorio roles,
            UsuarioRolRepositorio asignaciones,
            PasswordEncoder encoder,
            AutenticacionServicio autenticacion) {
        this.validador = validador;
        this.em = em;
        this.usuarios = usuarios;
        this.roles = roles;
        this.asignaciones = asignaciones;
        this.encoder = encoder;
        this.autenticacion = autenticacion;
    }

    private static boolean esConflictoUnico(Throwable error) {
        for (Throwable causa = error;
                causa != null; causa = causa.getCause()) {
            if (causa instanceof java.sql.SQLException sql
                    && sql.getErrorCode() == 1062
                    && "23000".equals(sql.getSQLState())) {
                return true;
            }
        }
        return false;
    }

    @Transactional
    public LoginRespuesta entrar(String credencial) {
        var identidad = validador.validar(credencial);

        var encontrados = em.createNativeQuery(
            "SELECT usuario_id FROM identidades_google " +
            "WHERE google_sub=:sub")
            .setParameter("sub", identidad.sub())
            .getResultList();

        Usuario usuario;

        if (!encontrados.isEmpty()) {
            long id = ((Number) encontrados.get(0)).longValue();
            usuario = usuarios.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Cuenta no disponible"));
        } else {
            try {
                if (usuarios.existsByCorreo(identidad.correo())) {
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ya existe una cuenta con ese correo. " +
                        "Utiliza tu inicio de sesion habitual.");
                }

                Rol usuarioRol = roles.findByCodigo("USUARIO")
                    .orElseThrow(() -> new IllegalStateException(
                        "Falta el rol USUARIO"));

                byte[] claveAleatoria = new byte[32];
                aleatorio.nextBytes(claveAleatoria);

                String claveNoConocida = Base64.getUrlEncoder()
                    .withoutPadding().encodeToString(claveAleatoria);

                LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);

                usuario = usuarios.save(new Usuario(
                    identidad.correo(),
                    identidad.nombre(),
                    encoder.encode(claveNoConocida),
                    ahora
                ));

                em.flush();
                asignaciones.save(new UsuarioRol(
                    usuario, usuarioRol, ahora));

                em.createNativeQuery(
                    "INSERT INTO identidades_google " +
                    "(usuario_id,google_sub,creado_en) " +
                    "VALUES (:usuario,:sub,:fecha)")
                    .setParameter("usuario", usuario.getId())
                    .setParameter("sub", identidad.sub())
                    .setParameter("fecha", ahora)
                    .executeUpdate();

                em.flush();
            } catch (RuntimeException error) {
                if (esConflictoUnico(error)) {
                    throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Conflicto al registrar la cuenta. Intenta nuevamente.");
                }
                throw error;
            }
        }

        if (usuario.getEliminadoEn() != null) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Cuenta no disponible");
        }

        return autenticacion.emitirSesion(usuario);
    }
}
