package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.dto.RegistroSolicitud;
import mx.edu.ito.saboresoaxaca.auth.excepcion.CorreoDuplicadoException;
import mx.edu.ito.saboresoaxaca.auth.servicio.RegistroServicio;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Rol;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.RolRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRolRepositorio;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.sql.SQLException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RegistroServicioTest {
    @Test
    void conflictoConcurrenteIdentificaSoloIndiceDeCorreo() {
        UsuarioRepositorio usuarios = mock(UsuarioRepositorio.class);
        RolRepositorio roles = mock(RolRepositorio.class);
        UsuarioRolRepositorio asignaciones = mock(UsuarioRolRepositorio.class);
        when(roles.findByCodigo("USUARIO")).thenReturn(Optional.of(mock(Rol.class)));
        RegistroServicio servicio = new RegistroServicio(usuarios, roles, asignaciones, new BCryptPasswordEncoder());
        RegistroSolicitud solicitud = new RegistroSolicitud();
        solicitud.setNombreVisible("Ana");
        solicitud.setCorreo(" ANA@EJEMPLO.INVALID ");
        solicitud.setContrasena("Ejemplo1!");
        when(usuarios.save(any(Usuario.class))).thenThrow(new DataIntegrityViolationException("error", new SQLException("Duplicate entry for key 'usuarios.uq_usuarios_correo'", "23000", 1062)));
        assertThrows(CorreoDuplicadoException.class, () -> servicio.registrar(solicitud));
        verify(usuarios).existsByCorreo("ana@ejemplo.invalid");
        verifyNoInteractions(asignaciones);
        when(usuarios.save(any(Usuario.class))).thenThrow(new DataIntegrityViolationException("error", new SQLException("Duplicate entry for key 'otra'", "23000", 1062)));
        assertThrows(DataIntegrityViolationException.class, () -> servicio.registrar(solicitud));
    }
}
