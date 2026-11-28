package mx.edu.ito.saboresoaxaca.usuario.controlador;

import jakarta.validation.Valid;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloAdmin;
import mx.edu.ito.saboresoaxaca.usuario.dto.AdministracionUsuariosDto;
import mx.edu.ito.saboresoaxaca.usuario.servicio.AdministracionUsuariosServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;
import java.util.Map;

@RestController @RequestMapping("/api/v1/admin/usuarios") @Profile("!bootstrap") @SoloAdmin
public class AdministracionUsuariosControlador {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> errorAdministrativo(ResponseStatusException ex) {
        String codigo = switch (ex.getReason() == null ? "" : ex.getReason()) {
            case "La cuenta está inactiva" -> "CUENTA_INACTIVA";
            case "No puedes desactivar tu propia cuenta" -> "AUTODESACTIVACION";
            case "Debe permanecer un administrador activo" -> "ULTIMO_ADMIN";
            case "La cuenta ya tiene ese estado" -> "ESTADO_SIN_CAMBIOS";
            default -> "ERROR_ADMINISTRACION";
        };
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("codigo", codigo));
    }
    private final AdministracionUsuariosServicio servicio;
    public AdministracionUsuariosControlador(AdministracionUsuariosServicio servicio) { this.servicio = servicio; }
    @GetMapping public AdministracionUsuariosDto.Pagina listar(@Valid @ModelAttribute AdministracionUsuariosDto.Filtro filtro) { return servicio.listar(filtro); }
    @GetMapping("/{id}") public AdministracionUsuariosDto.Usuario detalle(@PathVariable long id) { return servicio.detalle(idValido(id)); }
    @PutMapping("/{id}/roles/cocinero") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void asignar(@PathVariable long id) { servicio.cambiarCocinero(idValido(id), true); }
    @DeleteMapping("/{id}/roles/cocinero") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void retirar(@PathVariable long id) { servicio.cambiarCocinero(idValido(id), false); }
    @PutMapping("/{id}/roles/moderador") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void asignarModerador(@PathVariable long id) { servicio.cambiarModerador(idValido(id), true); }
    @DeleteMapping("/{id}/roles/moderador") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void retirarModerador(@PathVariable long id) { servicio.cambiarModerador(idValido(id), false); }
    @PostMapping("/{id}/desactivar") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desactivar(@PathVariable long id) { servicio.cambiarEstado(idValido(id), false); }
    @PostMapping("/{id}/reactivar") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reactivar(@PathVariable long id) { servicio.cambiarEstado(idValido(id), true); }
    private long idValido(long id) { if (id < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador inválido"); return id; }
}
