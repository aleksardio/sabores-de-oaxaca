package mx.edu.ito.saboresoaxaca.auth.google;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import mx.edu.ito.saboresoaxaca.auth.dto.LoginRespuesta;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Rol;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import mx.edu.ito.saboresoaxaca.usuario.entidad.UsuarioRol;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.RolRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRolRepositorio;

import org.springframework.dao.DataIntegrityViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GoogleAuthServicioTest {
    private GoogleIdTokenValidator validador;
    private EntityManager em;
    private Query consulta;
    private UsuarioRepositorio usuarios;
    private RolRepositorio roles;
    private UsuarioRolRepositorio asignaciones;
    private AutenticacionServicio autenticacion;
    private GoogleAuthServicio servicio;

    private static final String CREDENCIAL = "credencial-de-prueba";

    @BeforeEach
    void preparar() {
        validador = mock(GoogleIdTokenValidator.class);
        em = mock(EntityManager.class);
        consulta = mock(Query.class);
        usuarios = mock(UsuarioRepositorio.class);
        roles = mock(RolRepositorio.class);
        asignaciones = mock(UsuarioRolRepositorio.class);
        autenticacion = mock(AutenticacionServicio.class);

        when(validador.validar(CREDENCIAL)).thenReturn(
            new GoogleIdTokenValidator.Identidad(
                "google-sub-123",
                "ana@ejemplo.com",
                "Ana"
            )
        );

        when(em.createNativeQuery(anyString())).thenReturn(consulta);
        when(consulta.setParameter(anyString(), any())).thenReturn(consulta);

        servicio = new GoogleAuthServicio(
            validador,
            em,
            usuarios,
            roles,
            asignaciones,
            new BCryptPasswordEncoder(),
            autenticacion
        );
    }

    @Test
    void primeraCuentaRecibeSolamenteRolUsuario() {
        when(consulta.getResultList()).thenReturn(List.of());

        Rol rolUsuario = mock(Rol.class);
        when(rolUsuario.getId()).thenReturn(4L);
        when(rolUsuario.getCodigo()).thenReturn("USUARIO");
        when(roles.findByCodigo("USUARIO"))
            .thenReturn(Optional.of(rolUsuario));

        when(usuarios.save(any(Usuario.class))).thenAnswer(invocacion -> {
            Usuario usuario = invocacion.getArgument(0);
            ReflectionTestUtils.setField(usuario, "id", 1L);
            return usuario;
        });

        servicio.entrar(CREDENCIAL);

        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class);
        verify(usuarios).save(captor.capture());

        Usuario creado = captor.getValue();

        assertEquals("ana@ejemplo.com", creado.getCorreo());
        assertEquals("Ana", creado.getNombreVisible());
        assertTrue(creado.getContrasenaHash().startsWith("$2"));

        verify(asignaciones, times(1)).save(
            argThat(asignacion ->
                asignacion.getUsuario() == creado
                && asignacion.getRol() == rolUsuario
            )
        );

        verify(roles).findByCodigo("USUARIO");
        verify(em, times(2)).createNativeQuery(anyString());
        verify(consulta).executeUpdate();
        verify(autenticacion).emitirSesion(creado);
    }

    @Test
    void segundaSesionReutilizaUsuarioExistente() {
        when(consulta.getResultList()).thenReturn(List.of(1L));

        Usuario existente = new Usuario(
            "ana@ejemplo.com",
            "Ana",
            "hash-anterior",
            LocalDateTime.now()
        );

        ReflectionTestUtils.setField(existente, "id", 1L);

        when(usuarios.findById(1L))
            .thenReturn(Optional.of(existente));

        servicio.entrar(CREDENCIAL);

        verify(autenticacion).emitirSesion(existente);
        verify(usuarios, never()).save(any());
        verify(asignaciones, never()).save(any());
        verify(consulta, never()).executeUpdate();
    }

    @Test
    void noVinculaAutomaticamenteCorreoExistente() {
        when(consulta.getResultList()).thenReturn(List.of());
        when(usuarios.existsByCorreo("ana@ejemplo.com"))
            .thenReturn(true);

        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> servicio.entrar(CREDENCIAL)
        );

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());

        verify(usuarios, never()).save(any());
        verify(asignaciones, never()).save(any());
        verifyNoInteractions(autenticacion);
    }

    @Test
    void cuentaEliminadaNoPuedeIniciarSesion() {
        when(consulta.getResultList()).thenReturn(List.of(1L));

        Usuario eliminado = new Usuario(
            "ana@ejemplo.com",
            "Ana",
            "hash-anterior",
            LocalDateTime.now()
        );

        ReflectionTestUtils.setField(eliminado, "id", 1L);
        ReflectionTestUtils.setField(
            eliminado, "eliminadoEn", LocalDateTime.now()
        );

        when(usuarios.findById(1L))
            .thenReturn(Optional.of(eliminado));

        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> servicio.entrar(CREDENCIAL)
        );

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());

        verifyNoInteractions(autenticacion);
    }

    @Test
    void conflictoConcurrenteResponde409() {
        when(consulta.getResultList()).thenReturn(List.of());

        when(roles.findByCodigo("USUARIO"))
            .thenReturn(Optional.of(mock(Rol.class)));

        when(usuarios.save(any(Usuario.class)))
            .thenThrow(new DataIntegrityViolationException(
                "Clave duplicada",
                new java.sql.SQLException(
                    "Duplicate entry", "23000", 1062)));

        ResponseStatusException error = assertThrows(
            ResponseStatusException.class,
            () -> servicio.entrar(CREDENCIAL)
        );

        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verifyNoInteractions(autenticacion);
        verifyNoInteractions(asignaciones);
    }
}
