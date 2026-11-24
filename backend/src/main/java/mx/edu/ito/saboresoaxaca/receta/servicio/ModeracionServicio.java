package mx.edu.ito.saboresoaxaca.receta.servicio;

import jakarta.persistence.EntityManager;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.Moderacion;
import mx.edu.ito.saboresoaxaca.receta.dto.ModeracionDto;
import mx.edu.ito.saboresoaxaca.receta.dto.RecetasDto;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.receta.repositorio.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service @Profile("!bootstrap")
public class ModeracionServicio {
    private final EntityManager em;
    private final RecetaCategoriaRepositorio categorias;
    private final RecetaIngredienteRepositorio ingredientes;
    private final RecetaMultimediaRepositorio multimedia;
    public ModeracionServicio(EntityManager em, RecetaCategoriaRepositorio categorias, RecetaIngredienteRepositorio ingredientes, RecetaMultimediaRepositorio multimedia) {
        this.em=em; this.categorias=categorias; this.ingredientes=ingredientes; this.multimedia=multimedia;
    }

    @Moderacion @Transactional(readOnly=true)
    public ModeracionDto.Pagina listar(int pagina, int tamano, String tipo) {
        if (pagina < 0 || tamano < 1 || tamano > 50 || (long) pagina * tamano > Integer.MAX_VALUE || (tipo != null && !List.of("COMUN", "TRADICIONAL_OAXAQUENA").contains(tipo))) throw error(HttpStatus.BAD_REQUEST, "Filtros inválidos");
        String filtro = " from Receta r where r.estado='PENDIENTE' and r.eliminadoEn is null and (:tipo is null or r.tipo=:tipo)";
        long total = em.createQuery("select count(r)" + filtro, Long.class).setParameter("tipo", tipo).getSingleResult();
        var contenido = em.createQuery("select r" + filtro + " order by r.id asc", Receta.class).setParameter("tipo", tipo).setFirstResult(pagina*tamano).setMaxResults(tamano).getResultList().stream()
                .map(r -> new ModeracionDto.Resumen(r.getId(), r.getTitulo(), r.getTipo(), r.getAutor().getId(), r.getAutor().getNombreVisible(), r.getVersionReceta())).toList();
        return new ModeracionDto.Pagina(contenido, pagina, tamano, total, (int)((total + tamano - 1)/tamano));
    }

    @Moderacion @Transactional(readOnly=true)
    public ModeracionDto.Detalle detalle(Long id) {
        Receta r = em.find(Receta.class, id);
        if (r == null || !"PENDIENTE".equals(r.getEstado()) || r.getEliminadoEn()!=null) throw error(HttpStatus.NOT_FOUND, "Receta no encontrada");
        var cats = categorias.buscarParaRecetas(List.of(id)).stream().map(rc -> new RecetasDto.Categoria(rc.getCategoria().getId(), rc.getCategoria().getNombre(), rc.getCategoria().getDescripcion())).toList();
        var ings = ingredientes.buscarParaRecetas(List.of(id)).stream().map(i -> new RecetasDto.Ingrediente(i.getIngrediente().getId(), i.getIngrediente().getNombre(), i.getCantidad(), null, i.getUnidad(), i.getOrden(), i.getNota())).toList();
        var medios = multimedia.buscarParaRecetas(List.of(id)).stream().map(m -> new RecetasDto.Multimedia(m.getId(),m.getTipo(),m.getUrl(),m.getTextoAlternativo(),m.getOrden())).toList();
        return new ModeracionDto.Detalle(r.getId(),r.getTitulo(),r.getDescripcion(),r.getPreparacion(),r.getTipo(),r.getPorcionesBase(),r.getEstado(),r.getVersionReceta(),r.getAutor().getId(),r.getAutor().getNombreVisible(),cats,ings,medios);
    }

    @Moderacion @Transactional
    public ModeracionDto.Decision decidir(Long id, String ifMatch, boolean aprobar, String motivo) {
        Long version;
        try { if (ifMatch == null || !ifMatch.matches("\"(0|[1-9][0-9]*)\"")) throw new IllegalArgumentException(); version=Long.valueOf(ifMatch.substring(1,ifMatch.length()-1)); }
        catch (IllegalArgumentException e) { throw error(HttpStatus.BAD_REQUEST,"If-Match inválido"); }
        if (!aprobar && (motivo == null || motivo.isBlank() || motivo.strip().length()>1000)) throw error(HttpStatus.BAD_REQUEST,"Motivo inválido");
        Long actor=Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
        Receta r=em.find(Receta.class,id);
        if (r==null) throw error(HttpStatus.NOT_FOUND,"Receta no encontrada");
        if (r.getAutor().getId().equals(actor)) throw error(HttpStatus.FORBIDDEN,"No se permite autorrevisión");
        if (!version.equals(r.getVersionReceta()) || !"PENDIENTE".equals(r.getEstado()) || r.getEliminadoEn()!=null || r.getAutor().getEliminadoEn()!=null) throw error(HttpStatus.CONFLICT,"La receta cambió o no admite moderación");
        if (aprobar && (r.getTitulo().isBlank() || r.getDescripcion().isBlank() || r.getPreparacion().isBlank() || r.getPorcionesBase()<1
                || em.createQuery("select count(i) from RecetaIngrediente i where i.receta.id=:id", Long.class).setParameter("id",id).getSingleResult()==0
                || em.createQuery("select count(c) from RecetaCategoria c where c.receta.id=:id", Long.class).setParameter("id",id).getSingleResult()==0)) throw error(HttpStatus.CONFLICT,"Receta incompleta");
        var ahora=LocalDateTime.now(ZoneOffset.UTC);
        r.resolverModeracion(aprobar,ahora);
        em.flush();
        em.createNativeQuery("INSERT INTO auditoria_moderacion(actor_id,receta_id,accion,estado_receta_anterior,estado_receta_nuevo,detalle,creado_en) VALUES (:actor,:receta,:accion,'PENDIENTE',:estado,:detalle,:fecha)")
                .setParameter("actor",actor).setParameter("receta",id).setParameter("accion",aprobar ? "APROBAR" : "RECHAZAR").setParameter("estado",r.getEstado()).setParameter("detalle",aprobar ? null : motivo.strip()).setParameter("fecha",ahora).executeUpdate();
        return new ModeracionDto.Decision(id,r.getEstado(),r.getVersionReceta());
    }
    private static ResponseStatusException error(HttpStatus estado,String mensaje) { return new ResponseStatusException(estado,mensaje); }
}
