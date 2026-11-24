package mx.edu.ito.saboresoaxaca.receta.servicio;

import jakarta.persistence.EntityManager;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloCocinero;
import mx.edu.ito.saboresoaxaca.receta.dto.CrearRecetaSolicitud;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.receta.repositorio.RecetaRepositorio;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service @Profile("!bootstrap")
public class AccionesEditorialesServicio {
    private final RecetaRepositorio recetas;
    private final EntityManager em;
    public AccionesEditorialesServicio(RecetaRepositorio recetas, EntityManager em) { this.recetas = recetas; this.em = em; }

    @SoloCocinero @Transactional
    public void baja(Long id, String ifMatch) {
        Receta receta = propia(id, ifMatch);
        if (!PoliticaEditorialReceta.permiteBajaAutor(receta.getEstado(), receta.getEliminadoEn() != null))
            throw error(HttpStatus.CONFLICT, "La receta no admite baja");
        receta.darBaja(LocalDateTime.now(ZoneOffset.UTC));
        em.flush();
    }

    @SoloCocinero @Transactional
    public CrearRecetaSolicitud.Respuesta enviarRevision(Long id, String ifMatch) {
        Receta receta = propia(id, ifMatch);
        if (!PoliticaEditorialReceta.permiteEnviarRevision(receta.getEstado(), receta.getEliminadoEn() != null))
            throw error(HttpStatus.CONFLICT, "La receta no admite envío a revisión");
        if (vacio(receta.getTitulo()) || vacio(receta.getDescripcion()) || vacio(receta.getPreparacion())
                || receta.getPorcionesBase() == null || receta.getPorcionesBase() <= 0
                || em.createQuery("select count(i) from RecetaIngrediente i where i.receta.id = :id", Long.class).setParameter("id", id).getSingleResult() == 0
                || em.createQuery("select count(c) from RecetaCategoria c where c.receta.id = :id", Long.class).setParameter("id", id).getSingleResult() == 0)
            throw error(HttpStatus.CONFLICT, "La receta está incompleta");
        receta.enviarRevision(LocalDateTime.now(ZoneOffset.UTC));
        em.flush();
        return new CrearRecetaSolicitud.Respuesta(receta.getId(), receta.getEstado(), receta.getVersionReceta());
    }

    private Receta propia(Long id, String ifMatch) {
        Long version;
        try {
            if (ifMatch == null || !ifMatch.matches("\"(0|[1-9][0-9]*)\"")) throw new IllegalArgumentException();
            version = Long.valueOf(ifMatch.substring(1, ifMatch.length() - 1));
        } catch (IllegalArgumentException e) { throw error(HttpStatus.BAD_REQUEST, "If-Match inválido"); }
        Long autor = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
        Receta receta = recetas.buscarPropia(id, autor).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Receta no encontrada"));
        if (!version.equals(receta.getVersionReceta())) throw error(HttpStatus.CONFLICT, "Los datos cambiaron; vuelva a consultar");
        return receta;
    }
    private static boolean vacio(String valor) { return valor == null || valor.isBlank(); }
    private static ResponseStatusException error(HttpStatus estado, String mensaje) { return new ResponseStatusException(estado, mensaje); }
}
