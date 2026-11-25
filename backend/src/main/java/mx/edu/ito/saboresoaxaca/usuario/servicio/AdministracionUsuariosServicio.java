package mx.edu.ito.saboresoaxaca.usuario.servicio;

import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloAdmin;
import mx.edu.ito.saboresoaxaca.usuario.dto.AdministracionUsuariosDto;
import mx.edu.ito.saboresoaxaca.usuario.entidad.*;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.*;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    public AdministracionUsuariosServicio(UsuarioRepositorio usuarios, UsuarioRolRepositorio asignaciones, RolRepositorio roles) {
        this.usuarios = usuarios; this.asignaciones = asignaciones; this.roles = roles;
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
        Usuario usuario = usuarios.buscarParaCambioDeRol(id).orElseThrow(AdministracionUsuariosServicio::noExiste);
        if (usuario.getEliminadoEn() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "La cuenta está inactiva");
        Rol rol = roles.findByCodigo("COCINERO").orElseThrow(() -> new IllegalStateException("Falta el rol COCINERO"));
        var actual = asignaciones.findById(new UsuarioRolId(id, rol.getId()));
        if (asignar && actual.isEmpty()) asignaciones.save(new UsuarioRol(usuario, rol, LocalDateTime.now(ZoneOffset.UTC)));
        else if (!asignar) actual.ifPresent(asignaciones::delete);
    }
    private static AdministracionUsuariosDto.Usuario dto(Usuario u, List<String> roles) {
        return new AdministracionUsuariosDto.Usuario(u.getId(), u.getNombreVisible(), u.getCorreo(), u.getEliminadoEn() == null, u.getCreadoEn(), roles);
    }
    private static ResponseStatusException noExiste() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"); }
}
