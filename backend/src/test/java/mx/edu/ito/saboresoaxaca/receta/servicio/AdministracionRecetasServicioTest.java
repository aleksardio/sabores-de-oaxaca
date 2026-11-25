package mx.edu.ito.saboresoaxaca.receta.servicio;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Query;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.receta.repositorio.RecetaRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdministracionRecetasServicioTest {
    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }

    @Test void restauracionPublicadaEsAuditadaYVersionObsoletaNoEscribe() {
        EntityManager em=mock(EntityManager.class);
        Receta receta=mock(Receta.class);
        Usuario autor=mock(Usuario.class);
        Query query=mock(Query.class, RETURNS_SELF);
        when(em.find(Receta.class,7L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(receta);
        when(receta.getVersionReceta()).thenReturn(3L,3L,4L);
        when(receta.getEliminadoEn()).thenReturn(LocalDateTime.now());
        when(receta.getEstado()).thenReturn("PUBLICADA","PENDIENTE");
        when(receta.getAutor()).thenReturn(autor);
        when(em.createNativeQuery(anyString())).thenReturn(query);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("1","",java.util.List.of()));
        var servicio=new AdministracionRecetasServicio(mock(RecetaRepositorio.class),em);
        assertEquals(409,assertThrows(ResponseStatusException.class,()->servicio.cambiar(7,"\"2\"","Motivo",true)).getStatusCode().value());
        verify(em,never()).createNativeQuery(anyString());
        servicio.cambiar(7,"\"3\"","Motivo",true);
        verify(receta).restaurarBaja(any());
        verify(em).createNativeQuery(contains("auditoria_administrativa"));
        verify(em).createNativeQuery(contains("auditoria_moderacion"));
    }
}
