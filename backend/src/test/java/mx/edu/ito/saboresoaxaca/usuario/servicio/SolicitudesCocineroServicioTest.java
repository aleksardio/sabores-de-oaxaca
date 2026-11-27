package mx.edu.ito.saboresoaxaca.usuario.servicio;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRolRepositorio;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SolicitudesCocineroServicioTest {
    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }
    @Test void rechazaDuplicadoAntesDeInsertar() {
        var em=mock(EntityManager.class);
        var usuarios=mock(UsuarioRepositorio.class);
        var roles=mock(UsuarioRolRepositorio.class);
        var query=mock(Query.class, RETURNS_SELF);
        when(usuarios.buscarParaCambioDeRol(1L)).thenReturn(Optional.of(mock(Usuario.class)));
        when(roles.findByUsuario_Id(1L)).thenReturn(List.of());
        when(em.createNativeQuery(contains("SELECT s.id"))).thenReturn(query);
        Object[] row={7L,1L,"Ana","PENDIENTE",LocalDateTime.now(),null};
        when(query.getResultList()).thenReturn(java.util.Collections.singletonList(row));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("1","",List.of()));
        var servicio=new SolicitudesCocineroServicio(em,usuarios,roles,mock(AdministracionUsuariosServicio.class));
        assertEquals(409,assertThrows(ResponseStatusException.class,servicio::solicitar).getStatusCode().value());
        verify(em,never()).createNativeQuery(contains("INSERT"));
    }
}
