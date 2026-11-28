package mx.edu.ito.saboresoaxaca.usuario.servicio;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import mx.edu.ito.saboresoaxaca.usuario.entidad.*;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AdministracionCuentasServicioTest {
    EntityManager em = mock(EntityManager.class);
    UsuarioRepositorio usuarios = mock(UsuarioRepositorio.class);
    UsuarioRolRepositorio asignaciones = mock(UsuarioRolRepositorio.class);
    RolRepositorio roles = mock(RolRepositorio.class);
    AdministracionUsuariosServicio servicio = new AdministracionUsuariosServicio(usuarios, asignaciones, roles, em);
    Query query = mock(Query.class, RETURNS_SELF);

    @BeforeEach void preparar() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("1", "", List.of()));
        when(em.createNativeQuery(anyString())).thenReturn(query);
    }
    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }
    @Test void impideAutodesactivacion() {
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> servicio.cambiarEstado(1, false)).getStatusCode().value());
        verifyNoInteractions(usuarios);
    }
    @Test void impideQuitarUltimoAdministrador() {
        Rol admin=mock(Rol.class); UsuarioRol asignacion=mock(UsuarioRol.class);
        when(admin.getCodigo()).thenReturn("ADMIN"); when(asignacion.getRol()).thenReturn(admin);
        when(roles.bloquearPorCodigo("ADMIN")).thenReturn(Optional.of(admin));
        when(usuarios.buscarParaCambioDeRol(2L)).thenReturn(Optional.of(mock(Usuario.class)));
        when(asignaciones.findByUsuario_Id(2L)).thenReturn(List.of(asignacion));
        when(query.getSingleResult()).thenReturn(1L);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> servicio.cambiarEstado(2, false)).getStatusCode().value());
        verify(query, never()).executeUpdate();
    }
    @Test void desactivaYReactivaSinRecuperarTokens() {
        Usuario u=new Usuario("a@ejemplo.invalid", "Ana", "hash", LocalDateTime.now());
        when(roles.bloquearPorCodigo("ADMIN")).thenReturn(Optional.of(mock(Rol.class)));
        when(usuarios.buscarParaCambioDeRol(2L)).thenReturn(Optional.of(u));
        when(asignaciones.findByUsuario_Id(2L)).thenReturn(List.of());
        servicio.cambiarEstado(2, false);
        assertNotNull(u.getEliminadoEn()); assertEquals(1L, u.getVersionTokens());
        servicio.cambiarEstado(2, true);
        assertNull(u.getEliminadoEn()); assertEquals(1L, u.getVersionTokens());
        verify(query, times(2)).executeUpdate();
    }
    @Test void moderadorCambiaVersionSoloSiCambiaRol() {
        Usuario u=new Usuario("a@ejemplo.invalid", "Ana", "hash", LocalDateTime.now()); Rol r=mock(Rol.class);
        org.springframework.test.util.ReflectionTestUtils.setField(u,"id",2L);
        when(r.getId()).thenReturn(3L); when(roles.findByCodigo("MODERADOR")).thenReturn(Optional.of(r));
        when(usuarios.buscarParaCambioDeRol(2L)).thenReturn(Optional.of(u));
        when(asignaciones.findById(any())).thenReturn(Optional.empty());
        servicio.cambiarModerador(2,true);
        assertEquals(1L,u.getVersionTokens()); verify(asignaciones).save(any());
        UsuarioRol existente=mock(UsuarioRol.class);
        when(asignaciones.findById(any())).thenReturn(Optional.of(existente));
        servicio.cambiarModerador(2,true);
        assertEquals(1L,u.getVersionTokens());
        servicio.cambiarModerador(2,false);
        assertEquals(2L,u.getVersionTokens()); verify(asignaciones).delete(existente);
    }
}
