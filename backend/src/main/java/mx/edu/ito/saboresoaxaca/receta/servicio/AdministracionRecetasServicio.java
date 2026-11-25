package mx.edu.ito.saboresoaxaca.receta.servicio;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloAdmin;
import mx.edu.ito.saboresoaxaca.receta.dto.AdministracionRecetasDto;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.receta.repositorio.RecetaRepositorio;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service @Profile("!bootstrap")
public class AdministracionRecetasServicio {
    private final RecetaRepositorio recetas;
    private final EntityManager em;
    public AdministracionRecetasServicio(RecetaRepositorio recetas, EntityManager em) { this.recetas=recetas; this.em=em; }

    @SoloAdmin @Transactional(readOnly=true)
    public AdministracionRecetasDto.Pagina listar(String texto, String estado, Boolean baja, int pagina, int tamano) {
        if (pagina<0 || tamano<1 || tamano>100 || (long)pagina*tamano>Integer.MAX_VALUE || (texto!=null && texto.length()>100)
                || (estado!=null && !List.of("BORRADOR","PENDIENTE","PUBLICADA","RECHAZADA","ARCHIVADA").contains(estado)))
            throw error(HttpStatus.BAD_REQUEST,"Filtros inválidos");
        String filtro=texto==null || texto.isBlank() ? null : texto.strip().replace("!","!!").replace("%","!%").replace("_","!_");
        var resultado=recetas.buscarAdministracion(filtro,estado,baja,PageRequest.of(pagina,tamano));
        return new AdministracionRecetasDto.Pagina(resultado.getContent().stream().map(AdministracionRecetasServicio::dto).toList(),pagina,tamano,resultado.getTotalElements(),resultado.getTotalPages());
    }

    @SoloAdmin @Transactional(readOnly=true)
    public AdministracionRecetasDto.Receta detalle(long id) { return dto(buscar(id, false)); }

    @SoloAdmin @Transactional
    public AdministracionRecetasDto.Receta cambiar(long id, String ifMatch, String detalle, boolean restaurar) {
        long version;
        try {
            if (ifMatch==null || !ifMatch.matches("\"(0|[1-9][0-9]*)\"")) throw new IllegalArgumentException();
            version=Long.parseLong(ifMatch.substring(1,ifMatch.length()-1));
        } catch (IllegalArgumentException e) { throw error(HttpStatus.BAD_REQUEST,"If-Match inválido"); }
        if (detalle==null || detalle.isBlank() || detalle.strip().length()>1000) throw error(HttpStatus.BAD_REQUEST,"Justificación inválida");
        Receta receta=buscar(id,true);
        if (receta.getVersionReceta()!=version || (restaurar ? receta.getEliminadoEn()==null : receta.getEliminadoEn()!=null))
            throw error(HttpStatus.CONFLICT,"La receta cambió o no admite la operación");
        long actor=Long.parseLong(SecurityContextHolder.getContext().getAuthentication().getName());
        var fecha=LocalDateTime.now(ZoneOffset.UTC);
        boolean publicada="PUBLICADA".equals(receta.getEstado());
        if (restaurar) receta.restaurarBaja(fecha); else receta.darBaja(fecha);
        em.flush();
        em.createNativeQuery("INSERT INTO auditoria_administrativa(actor_id,accion,receta_afectada_id,detalle,creado_en) VALUES (:actor,:accion,:id,:detalle,:fecha)")
                .setParameter("actor",actor).setParameter("accion",restaurar ? "RESTAURAR_RECETA" : "BAJA_RECETA").setParameter("id",id).setParameter("detalle",detalle.strip()).setParameter("fecha",fecha).executeUpdate();
        if (restaurar && publicada) em.createNativeQuery("INSERT INTO auditoria_moderacion(actor_id,receta_id,accion,estado_receta_anterior,estado_receta_nuevo,detalle,creado_en) VALUES (:actor,:id,'RESTAURAR_BAJA','PUBLICADA','PENDIENTE',:detalle,:fecha)")
                .setParameter("actor",actor).setParameter("id",id).setParameter("detalle",detalle.strip()).setParameter("fecha",fecha).executeUpdate();
        return dto(receta);
    }
    private Receta buscar(long id, boolean bloqueo) {
        if (id<1) throw error(HttpStatus.BAD_REQUEST,"Identificador inválido");
        Receta r=bloqueo ? em.find(Receta.class,id,LockModeType.PESSIMISTIC_WRITE) : em.find(Receta.class,id);
        if (r==null) throw error(HttpStatus.NOT_FOUND,"Receta no encontrada");
        return r;
    }
    private static AdministracionRecetasDto.Receta dto(Receta r) { return new AdministracionRecetasDto.Receta(r.getId(),r.getTitulo(),r.getAutor().getNombreVisible(),r.getEstado(),r.getEliminadoEn(),r.getCreadoEn(),r.getVersionReceta()); }
    private static ResponseStatusException error(HttpStatus estado,String mensaje) { return new ResponseStatusException(estado,mensaje); }
}
