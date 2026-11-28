package mx.edu.ito.saboresoaxaca.usuario.servicio;

import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloAdmin;
import mx.edu.ito.saboresoaxaca.usuario.dto.AdministracionUsuariosDto;
import mx.edu.ito.saboresoaxaca.usuario.entidad.*;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.*;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service @Profile("!bootstrap")
public class AdministracionUsuariosServicio {
    private final UsuarioRepositorio usuarios;
    private final UsuarioRolRepositorio asignaciones;
    private final RolRepositorio roles;
    private final EntityManager em;
    public AdministracionUsuariosServicio(UsuarioRepositorio usuarios, UsuarioRolRepositorio asignaciones, RolRepositorio roles, EntityManager em) {
        this.usuarios = usuarios; this.asignaciones = asignaciones; this.roles = roles; this.em = em;
    }
    @SoloAdmin @Transactional(readOnly = true)
    public AdministracionUsuariosDto.Pagina listar(AdministracionUsuariosDto.Filtro filtro) {
        int pagina = filtro.pagina() == null ? 0 : filtro.pagina();
        int tamano = filtro.tamano() == null ? 20 : filtro.tamano();
        if ((long) pagina * tamano > Integer.MAX_VALUE) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parámetros inválidos");
        String texto = filtro.texto() == null || filtro.texto().isBlank() ? null : "%" + filtro.texto().trim().toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        var resultado = usuarios.buscarAdministracion(texto, filtro.activo(), filtro.rol(), PageRequest.of(pagina, tamano, Sort.by("id")));
        List<Long> ids = resultado.getContent().stream().map(Usuario::getId).toList();
        Map<Long, List<String>> porUsuario = ids.isEmpty() ? Map.of() : asignaciones.buscarRolesDeUsuarios(ids).stream().collect(Collectors.groupingBy(a -> a.getUsuario().getId(), Collectors.mapping(a -> a.getRol().getCodigo(), Collectors.toList())));
        var contenido = resultado.getContent().stream().map(u -> dto(u, porUsuario.getOrDefault(u.getId(), List.of()).stream().sorted().toList())).toList();
        return new AdministracionUsuariosDto.Pagina(contenido, pagina, tamano, resultado.getTotalElements(), resultado.getTotalPages());
    }
    @SoloAdmin @Transactional(readOnly = true)
    public AdministracionUsuariosDto.Usuario detalle(long id) {
        Usuario usuario = usuarios.findById(id).orElseThrow(AdministracionUsuariosServicio::noExiste);
        return dto(usuario, asignaciones.findByUsuario_Id(id).stream().map(a -> a.getRol().getCodigo()).sorted().toList());
    }
    @SoloAdmin @Transactional
    public void cambiarCocinero(long id, boolean asignar) {
        cambiarRol(id, "COCINERO", asignar);
    }
    @SoloAdmin @Transactional
    public void cambiarModerador(long id, boolean asignar) {
        cambiarRol(id, "MODERADOR", asignar);
    }
    private void cambiarRol(long id, String codigo, boolean asignar) {
        Usuario usuario = usuarios.buscarParaCambioDeRol(id).orElseThrow(AdministracionUsuariosServicio::noExiste);
        if (usuario.getEliminadoEn() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "La cuenta está inactiva");
        Rol rol = roles.findByCodigo(codigo).orElseThrow(() -> new IllegalStateException("Falta el rol " + codigo));
        var actual = asignaciones.findById(new UsuarioRolId(id, rol.getId()));
        if (asignar == actual.isPresent()) return;
        var ahora = LocalDateTime.now(ZoneOffset.UTC);
        if (asignar) asignaciones.save(new UsuarioRol(usuario, rol, ahora));
        else asignaciones.delete(actual.orElseThrow());
        usuario.invalidarSesiones(ahora);
        auditar(id, rol.getId(), asignar ? "ASIGNAR_ROL" : "RETIRAR_ROL", ahora);
    }
    @SoloAdmin @Transactional
    public void cambiarEstado(long id, boolean activar) {
        long actor = actor();
        if (!activar && actor == id) throw new ResponseStatusException(HttpStatus.CONFLICT, "No puedes desactivar tu propia cuenta");
        if (!activar) roles.bloquearPorCodigo("ADMIN").orElseThrow(() -> new IllegalStateException("Falta el rol ADMIN"));
        Usuario usuario = usuarios.buscarParaCambioDeRol(id).orElseThrow(AdministracionUsuariosServicio::noExiste);
        if ((usuario.getEliminadoEn() == null) == activar) throw new ResponseStatusException(HttpStatus.CONFLICT, "La cuenta ya tiene ese estado");
        if (!activar && asignaciones.findByUsuario_Id(id).stream().anyMatch(a -> "ADMIN".equals(a.getRol().getCodigo()))) {
            long activos = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM usuarios u JOIN usuarios_roles ur ON ur.usuario_id=u.id JOIN roles r ON r.id=ur.rol_id WHERE r.codigo='ADMIN' AND u.eliminado_en IS NULL").getSingleResult()).longValue();
            if (activos <= 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Debe permanecer un administrador activo");
        }
        var ahora = LocalDateTime.now(ZoneOffset.UTC);
        usuario.cambiarEstadoCuenta(activar, ahora);
        auditar(id, null, activar ? "REACTIVAR_CUENTA" : "DESACTIVAR_CUENTA", ahora);
    }
    private long actor() { return Long.parseLong(SecurityContextHolder.getContext().getAuthentication().getName()); }
    private void auditar(long id, Long rol, String accion, LocalDateTime ahora) {
        em.createNativeQuery("INSERT INTO auditoria_administrativa(actor_id,accion,usuario_afectado_id,rol_id,detalle,creado_en) VALUES (:actor,:accion,:usuario,:rol,:detalle,:fecha)")
            .setParameter("actor", actor()).setParameter("accion", accion).setParameter("usuario", id).setParameter("rol", rol)
            .setParameter("detalle", "Cambio administrativo de cuenta o rol").setParameter("fecha", ahora).executeUpdate();
    }
    private static AdministracionUsuariosDto.Usuario dto(Usuario u, List<String> roles) {
        return new AdministracionUsuariosDto.Usuario(u.getId(), u.getNombreVisible(), u.getCorreo(), u.getEliminadoEn() == null, u.getCreadoEn(), roles);
    }
    private static ResponseStatusException noExiste() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"); }
}
