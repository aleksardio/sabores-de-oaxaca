package mx.edu.ito.saboresoaxaca.receta.servicio;

import jakarta.persistence.EntityManager;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloCocinero;
import mx.edu.ito.saboresoaxaca.receta.dto.CrearRecetaSolicitud;
import mx.edu.ito.saboresoaxaca.receta.entidad.*;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service @Profile("!bootstrap")
public class CrearRecetaServicio {
    private final EntityManager em;
    public CrearRecetaServicio(EntityManager em) { this.em = em; }

    @SoloCocinero @Transactional
    public CrearRecetaSolicitud.Respuesta crear(CrearRecetaSolicitud solicitud) {
        validar(solicitud);
        Long autorId = Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
        Usuario autor = em.find(Usuario.class, autorId);
        if (autor == null || autor.getEliminadoEn() != null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        var ahora = LocalDateTime.now(ZoneOffset.UTC);
        var receta = new Receta(autor, solicitud.titulo(), solicitud.descripcion(), solicitud.preparacion(), solicitud.tipo(), solicitud.porcionesBase(), ahora);
        em.persist(receta);
        for (Long id : solicitud.categorias()) {
            Categoria categoria = em.find(Categoria.class, id);
            if (categoria == null) throw invalido();
            em.persist(new RecetaCategoria(receta, categoria));
        }
        for (var elemento : solicitud.ingredientes()) {
            Ingrediente ingrediente = em.find(Ingrediente.class, elemento.ingredienteId());
            if (ingrediente == null) throw invalido();
            em.persist(new RecetaIngrediente(receta, ingrediente, elemento.cantidad(), elemento.unidad(), elemento.orden(), elemento.nota()));
        }
        for (var elemento : solicitud.multimedia()) em.persist(new RecetaMultimedia(receta, elemento.tipo(), elemento.url(), elemento.textoAlternativo(), elemento.orden(), ahora));
        em.flush();
        return new CrearRecetaSolicitud.Respuesta(receta.getId(), receta.getEstado(), receta.getVersionReceta());
    }

    static void validar(CrearRecetaSolicitud s) {
        if (s == null || !texto(s.titulo(), 200) || !texto(s.descripcion(), 65535) || !texto(s.preparacion(), 16777215)
                || s.tipo() == null || !List.of("COMUN", "TRADICIONAL_OAXAQUENA").contains(s.tipo()) || s.porcionesBase() == null || s.porcionesBase() < 1
                || s.categorias() == null || s.ingredientes() == null || s.multimedia() == null
                || s.categorias().size() > 100 || s.ingredientes().size() > 500 || s.multimedia().size() > 100) throw invalido();
        Set<Long> categorias = new HashSet<>(), ids = new HashSet<>();
        Set<Integer> ordenes = new HashSet<>();
        for (Long id : s.categorias()) if (id == null || id < 1 || !categorias.add(id)) throw invalido();
        for (var i : s.ingredientes()) {
            if (i == null || i.ingredienteId() == null || i.ingredienteId() < 1 || !ids.add(i.ingredienteId())
                    || i.orden() == null || i.orden() < 1 || !ordenes.add(i.orden()) || (i.nota() != null && i.nota().length() > 255)
                    || i.unidad() == null || !List.of("G", "KG", "ML", "L", "PIEZA", "CUCHARADA", "CUCHARADITA", "TAZA", "AL_GUSTO").contains(i.unidad())) throw invalido();
            if (i.unidad().equals("AL_GUSTO")) { if (i.cantidad() != null) throw invalido(); }
            else if (i.cantidad() == null || i.cantidad().signum() <= 0 || i.cantidad().scale() > 3 || i.cantidad().compareTo(new BigDecimal("999999999.999")) > 0) throw invalido();
        }
        ordenes.clear();
        for (var m : s.multimedia()) {
            if (m == null || m.tipo() == null || !List.of("IMAGEN", "VIDEO").contains(m.tipo()) || !texto(m.url(), 2048)
                    || m.orden() == null || m.orden() < 1 || !ordenes.add(m.orden()) || (m.textoAlternativo() != null && m.textoAlternativo().length() > 255)) throw invalido();
            try { var uri = URI.create(m.url()); if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null) throw invalido(); }
            catch (IllegalArgumentException e) { throw invalido(); }
        }
    }
    private static boolean texto(String valor, int limite) { return valor != null && !valor.isBlank() && valor.length() <= limite; }
    private static ResponseStatusException invalido() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Datos inválidos"); }
}
