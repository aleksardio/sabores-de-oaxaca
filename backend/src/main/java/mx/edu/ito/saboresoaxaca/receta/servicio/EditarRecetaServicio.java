package mx.edu.ito.saboresoaxaca.receta.servicio;

import jakarta.persistence.EntityManager;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloCocinero;
import mx.edu.ito.saboresoaxaca.receta.dto.CrearRecetaSolicitud;
import mx.edu.ito.saboresoaxaca.receta.dto.EditarRecetaSolicitud;
import mx.edu.ito.saboresoaxaca.receta.entidad.*;
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
public class EditarRecetaServicio {
    private final EntityManager em;
    private final RecetaRepositorio recetas;
    public EditarRecetaServicio(EntityManager em, RecetaRepositorio recetas) { this.em = em; this.recetas = recetas; }

    @SoloCocinero @Transactional
    public CrearRecetaSolicitud.Respuesta editar(Long id, EditarRecetaSolicitud solicitud) {
        if (solicitud == null || solicitud.version() == null || solicitud.version() < 0) throw error(HttpStatus.BAD_REQUEST, "Versión inválida");
        CrearRecetaServicio.validar(solicitud.contenido());
        Long autor = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
        Receta receta = recetas.buscarPropia(id, autor).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Receta no encontrada"));
        if (!solicitud.version().equals(receta.getVersionReceta())) throw error(HttpStatus.CONFLICT, "Los datos cambiaron; vuelva a consultar");
        if (!PoliticaEditorialReceta.permiteEditar(receta.getEstado(), receta.getEliminadoEn() != null)) throw error(HttpStatus.CONFLICT, "La receta no admite edición");

        var ahora = LocalDateTime.now(ZoneOffset.UTC);
        receta.actualizarContenido(solicitud.titulo(), solicitud.descripcion(), solicitud.preparacion(), solicitud.tipo(), solicitud.porcionesBase(), ahora);
        // Flush primero: la actualización versionada serializa las escrituras de las asociaciones.
        em.flush();
        em.createQuery("delete from RecetaIngrediente i where i.receta.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("delete from RecetaCategoria c where c.receta.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("delete from RecetaMultimedia m where m.receta.id = :id").setParameter("id", id).executeUpdate();
        for (Long categoriaId : solicitud.categorias()) {
            Categoria categoria = em.find(Categoria.class, categoriaId);
            if (categoria == null) throw error(HttpStatus.BAD_REQUEST, "Datos inválidos");
            em.persist(new RecetaCategoria(receta, categoria));
        }
        for (var elemento : solicitud.ingredientes()) {
            Ingrediente ingrediente = em.find(Ingrediente.class, elemento.ingredienteId());
            if (ingrediente == null) throw error(HttpStatus.BAD_REQUEST, "Datos inválidos");
            em.persist(new RecetaIngrediente(receta, ingrediente, elemento.cantidad(), elemento.unidad(), elemento.orden(), elemento.nota()));
        }
        for (var m : solicitud.multimedia()) em.persist(new RecetaMultimedia(receta, m.tipo(), m.url(), m.textoAlternativo(), m.orden(), ahora));
        em.flush();
        return new CrearRecetaSolicitud.Respuesta(receta.getId(), receta.getEstado(), receta.getVersionReceta());
    }
    private static ResponseStatusException error(HttpStatus status, String mensaje) { return new ResponseStatusException(status, mensaje); }
}
