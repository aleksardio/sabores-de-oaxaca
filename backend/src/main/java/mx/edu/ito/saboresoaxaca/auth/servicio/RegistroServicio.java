package mx.edu.ito.saboresoaxaca.auth.servicio;

import mx.edu.ito.saboresoaxaca.auth.dto.RegistroRespuesta;
import mx.edu.ito.saboresoaxaca.auth.dto.RegistroSolicitud;
import mx.edu.ito.saboresoaxaca.auth.excepcion.CorreoDuplicadoException;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Rol;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import mx.edu.ito.saboresoaxaca.usuario.entidad.UsuarioRol;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.RolRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRolRepositorio;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@Profile("!bootstrap")
public class RegistroServicio {
    private final UsuarioRepositorio usuarios;
    private final RolRepositorio roles;
    private final UsuarioRolRepositorio asignaciones;
    private final PasswordEncoder encoder;

    public RegistroServicio(UsuarioRepositorio usuarios, RolRepositorio roles, UsuarioRolRepositorio asignaciones, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.asignaciones = asignaciones;
        this.encoder = encoder;
    }

    @Transactional
    public RegistroRespuesta registrar(RegistroSolicitud solicitud) {
        if (usuarios.existsByCorreo(solicitud.getCorreo())) throw new CorreoDuplicadoException();
        Rol rol = roles.findByCodigo("USUARIO").orElseThrow(() -> new IllegalStateException("Falta el rol de registro"));
        LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);
        Usuario usuario = new Usuario(solicitud.getCorreo(), solicitud.getNombreVisible(), encoder.encode(solicitud.getContrasena()), ahora);
        try {
            usuario = usuarios.save(usuario);
        } catch (DataIntegrityViolationException error) {
            if (esCorreoDuplicado(error)) throw new CorreoDuplicadoException();
            throw error;
        }
        asignaciones.save(new UsuarioRol(usuario, rol, ahora));
        return new RegistroRespuesta(usuario.getId(), usuario.getNombreVisible(), usuario.getCorreo());
    }

    private boolean esCorreoDuplicado(Throwable error) {
        for (Throwable causa = error; causa != null; causa = causa.getCause()) {
            if (causa instanceof SQLException sql && sql.getErrorCode() == 1062 && sql.getMessage() != null
                    && sql.getMessage().contains("uq_usuarios_correo")) return true;
        }
        return false;
    }
}
