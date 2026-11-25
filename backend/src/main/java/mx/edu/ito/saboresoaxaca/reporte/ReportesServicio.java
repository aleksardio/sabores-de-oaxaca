package mx.edu.ito.saboresoaxaca.reporte;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.Moderacion;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.Autenticado;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
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
public class ReportesServicio {
    private final EntityManager em;
    public ReportesServicio(EntityManager em) { this.em=em; }
    @Autenticado @Transactional
    public ReportesDto.Creado crear(Long id, String motivo) {
        long actor=actor();
        Receta r=em.find(Receta.class,id,LockModeType.PESSIMISTIC_WRITE);
        if (r==null || !"PUBLICADA".equals(r.getEstado()) || r.getEliminadoEn()!=null || r.getAutor().getEliminadoEn()!=null) throw error(HttpStatus.NOT_FOUND,"Receta no encontrada");
        if (r.getAutor().getId().equals(actor)) throw error(HttpStatus.FORBIDDEN,"No puede reportar su propia receta");
        var duplicados=em.createQuery("select p.id from Reporte p where p.receta.id=:receta and p.reportante.id=:actor and p.estado in ('ABIERTO','EN_REVISION')",Long.class)
                .setParameter("receta",id).setParameter("actor",actor).setLockMode(LockModeType.PESSIMISTIC_WRITE).setMaxResults(1).getResultList();
        if (!duplicados.isEmpty()) throw error(HttpStatus.CONFLICT,"Ya existe un reporte abierto");
        var fecha=LocalDateTime.now(ZoneOffset.UTC);
        Reporte p=new Reporte(r,em.getReference(Usuario.class,actor),motivo.strip(),fecha);
        em.persist(p);
        return new ReportesDto.Creado(p.getId(),id,p.getMotivo(),p.getEstado(),fecha);
    }
    @Moderacion @Transactional(readOnly=true)
    public ReportesDto.Pagina listar(int pagina,int tamano,String estado) {
        if (pagina<0 || tamano<1 || tamano>50 || (long)pagina*tamano>Integer.MAX_VALUE || (estado!=null && !List.of("ABIERTO","EN_REVISION","RESUELTO","DESCARTADO").contains(estado))) throw error(HttpStatus.BAD_REQUEST,"Filtros inválidos");
        String filtro=" from Reporte p where (:estado is null or p.estado=:estado)";
        long total=em.createQuery("select count(p)"+filtro,Long.class).setParameter("estado",estado).getSingleResult();
        var datos=em.createQuery("select p from Reporte p join fetch p.receta join fetch p.reportante where (:estado is null or p.estado=:estado) order by p.creadoEn asc,p.id asc",Reporte.class)
                .setParameter("estado",estado).setFirstResult(pagina*tamano).setMaxResults(tamano).getResultList().stream().map(ReportesServicio::dto).toList();
        return new ReportesDto.Pagina(datos,pagina,tamano,total,(int)((total+tamano-1)/tamano));
    }
    @Moderacion @Transactional(readOnly=true)
    public ReportesDto.Detalle detalle(Long id) {
        var datos=em.createQuery("select p from Reporte p join fetch p.receta join fetch p.reportante where p.id=:id",Reporte.class).setParameter("id",id).getResultList();
        if (datos.isEmpty()) throw error(HttpStatus.NOT_FOUND,"Reporte no encontrado");
        return dto(datos.get(0));
    }
    @Moderacion @Transactional
    public ReportesDto.Detalle resolver(Long id,boolean baja) {
        var ids=em.createQuery("select p.receta.id from Reporte p where p.id=:id",Long.class).setParameter("id",id).getResultList();
        if (ids.isEmpty()) throw error(HttpStatus.NOT_FOUND,"Reporte no encontrado");
        Receta receta=em.find(Receta.class,ids.get(0),LockModeType.PESSIMISTIC_WRITE);
        Reporte reporte=em.find(Reporte.class,id,LockModeType.PESSIMISTIC_WRITE);
        if (reporte==null) throw error(HttpStatus.NOT_FOUND,"Reporte no encontrado");
        if (!pendiente(reporte)) throw error(HttpStatus.CONFLICT,"El reporte ya fue resuelto");
        if (baja && (!"PUBLICADA".equals(receta.getEstado()) || receta.getEliminadoEn()!=null || receta.getAutor().getEliminadoEn()!=null)) throw error(HttpStatus.CONFLICT,"La receta no admite baja");
        var fecha=LocalDateTime.now(ZoneOffset.UTC); long actor=actor();
        if (baja) {
            receta.darBaja(fecha);
            em.flush();
            em.createNativeQuery("INSERT INTO auditoria_administrativa(actor_id,accion,receta_afectada_id,detalle,creado_en) VALUES (:actor,'BAJA_RECETA',:receta,:detalle,:fecha)")
                    .setParameter("actor",actor).setParameter("receta",receta.getId()).setParameter("detalle","Baja originada por reporte " + id).setParameter("fecha",fecha).executeUpdate();
            var pendientes=em.createQuery("select p from Reporte p where p.receta.id=:id and p.estado in ('ABIERTO','EN_REVISION') order by p.id",Reporte.class)
                    .setParameter("id",receta.getId()).setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultList();
            for (Reporte p : pendientes) transicion(p,"RESUELTO",actor,fecha,p.getId().equals(id) ? "Baja por reporte" : "Resuelto por baja originada por reporte " + id);
        } else transicion(reporte,"DESCARTADO",actor,fecha,"Reporte descartado");
        return dto(reporte);
    }
    private void transicion(Reporte p,String estado,long actor,LocalDateTime fecha,String detalle) {
        String anterior=p.getEstado(); p.resolver(estado,fecha);
        em.createNativeQuery("INSERT INTO auditoria_moderacion(actor_id,receta_id,reporte_id,accion,estado_reporte_anterior,estado_reporte_nuevo,detalle,creado_en) VALUES (:actor,:receta,:reporte,:accion,:anterior,:nuevo,:detalle,:fecha)")
                .setParameter("actor",actor).setParameter("receta",p.getReceta().getId()).setParameter("reporte",p.getId()).setParameter("accion",estado.equals("RESUELTO") ? "RESOLVER_REPORTE" : "DESCARTAR_REPORTE")
                .setParameter("anterior",anterior).setParameter("nuevo",estado).setParameter("detalle",detalle).setParameter("fecha",fecha).executeUpdate();
    }
    private static boolean pendiente(Reporte p) { return "ABIERTO".equals(p.getEstado()) || "EN_REVISION".equals(p.getEstado()); }
    private static long actor() { return Long.parseLong(SecurityContextHolder.getContext().getAuthentication().getName()); }
    private static ReportesDto.Detalle dto(Reporte p) { return new ReportesDto.Detalle(p.getId(),p.getReceta().getId(),p.getReceta().getTitulo(),p.getMotivo(),p.getCreadoEn(),p.getReportante().getNombreVisible(),p.getEstado(),p.getResueltoEn()); }
    private static ResponseStatusException error(HttpStatus status,String mensaje) { return new ResponseStatusException(status,mensaje); }
}
