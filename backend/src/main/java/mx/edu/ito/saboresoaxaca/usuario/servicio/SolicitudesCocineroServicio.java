package mx.edu.ito.saboresoaxaca.usuario.servicio;

import jakarta.persistence.EntityManager;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.Autenticado;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloAdmin;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRolRepositorio;
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
public class SolicitudesCocineroServicio {
    public record Solicitud(long id, long usuarioId, String nombre, String estado, LocalDateTime creadaEn, LocalDateTime resueltaEn) { }
    private final EntityManager em;
    private final UsuarioRepositorio usuarios;
    private final UsuarioRolRepositorio roles;
    private final AdministracionUsuariosServicio administracion;
    public SolicitudesCocineroServicio(EntityManager em, UsuarioRepositorio usuarios, UsuarioRolRepositorio roles, AdministracionUsuariosServicio administracion) {
        this.em=em; this.usuarios=usuarios; this.roles=roles; this.administracion=administracion;
    }
    private long actor() { return Long.parseLong(SecurityContextHolder.getContext().getAuthentication().getName()); }
    private Usuario activo(long id) {
        Usuario u=usuarios.buscarParaCambioDeRol(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND,"Usuario no encontrado"));
        if (u.getEliminadoEn()!=null) throw error(HttpStatus.CONFLICT,"Cuenta inactiva");
        return u;
    }
    private boolean cocinero(long id) { return roles.findByUsuario_Id(id).stream().anyMatch(r -> "COCINERO".equals(r.getRol().getCodigo())); }
    private Solicitud convertir(Object[] r) {
        return new Solicitud(((Number)r[0]).longValue(),((Number)r[1]).longValue(),(String)r[2],(String)r[3],fecha(r[4]),fecha(r[5]));
    }
    private LocalDateTime fecha(Object v) { return v == null ? null : v instanceof LocalDateTime d ? d : ((java.sql.Timestamp)v).toLocalDateTime(); }
    private static final String SELECT = "SELECT s.id,s.usuario_id,u.nombre_visible,s.estado,s.creada_en,s.resuelta_en FROM solicitudes_cocinero s JOIN usuarios u ON u.id=s.usuario_id ";
    @Autenticado @Transactional(readOnly=true)
    public Solicitud propia() {
        var filas=em.createNativeQuery(SELECT+"WHERE s.usuario_id=:id ORDER BY s.id DESC LIMIT 1").setParameter("id",actor()).getResultList();
        return filas.isEmpty() ? null : convertir((Object[])filas.get(0));
    }
    @Autenticado @Transactional
    public Solicitud solicitar() {
        long id=actor(); activo(id);
        if (cocinero(id)) throw error(HttpStatus.CONFLICT,"Ya cuentas con el rol COCINERO");
        Solicitud ultima=propia();
        if (ultima!=null && "PENDIENTE".equals(ultima.estado())) throw error(HttpStatus.CONFLICT,"Ya existe una solicitud pendiente");
        em.createNativeQuery("INSERT INTO solicitudes_cocinero(usuario_id,estado,creada_en) VALUES (:id,'PENDIENTE',:fecha)")
            .setParameter("id",id).setParameter("fecha",LocalDateTime.now(ZoneOffset.UTC)).executeUpdate();
        return propia();
    }
    @SoloAdmin @Transactional(readOnly=true)
    public List<Solicitud> pendientes(int pagina) {
        if (pagina<0 || (long)pagina*20>Integer.MAX_VALUE) throw error(HttpStatus.BAD_REQUEST,"Página inválida");
        return em.createNativeQuery(SELECT+"WHERE s.estado='PENDIENTE' ORDER BY s.id ASC").setFirstResult(pagina*20).setMaxResults(20).getResultList().stream().map(r -> convertir((Object[])r)).toList();
    }
    @SoloAdmin @Transactional
    public Solicitud resolver(long id, boolean aprobar) {
        var filas=em.createNativeQuery("SELECT usuario_id FROM solicitudes_cocinero WHERE id=:id").setParameter("id",id).getResultList();
        if (filas.isEmpty()) throw error(HttpStatus.NOT_FOUND,"Solicitud no encontrada");
        long usuarioId=((Number)filas.get(0)).longValue();
        activo(usuarioId);
        var bloqueada=em.createNativeQuery(SELECT+"WHERE s.id=:id FOR UPDATE").setParameter("id",id).getResultList();
        Solicitud solicitud=convertir((Object[])bloqueada.get(0));
        if (!"PENDIENTE".equals(solicitud.estado())) throw error(HttpStatus.CONFLICT,"La solicitud ya fue resuelta");
        if (aprobar) administracion.cambiarCocinero(usuarioId,true);
        em.createNativeQuery("UPDATE solicitudes_cocinero SET estado=:estado,resuelta_en=:fecha,resuelta_por=:admin WHERE id=:id")
            .setParameter("estado",aprobar ? "APROBADA" : "RECHAZADA").setParameter("fecha",LocalDateTime.now(ZoneOffset.UTC)).setParameter("admin",actor()).setParameter("id",id).executeUpdate();
        return convertir((Object[])em.createNativeQuery(SELECT+"WHERE s.id=:id").setParameter("id",id).getSingleResult());
    }
    private static ResponseStatusException error(HttpStatus status,String msg) { return new ResponseStatusException(status,msg); }
}
