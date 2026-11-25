package mx.edu.ito.saboresoaxaca.usuario.controlador;

import jakarta.validation.Valid;
import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloAdmin;
import mx.edu.ito.saboresoaxaca.usuario.dto.AdministracionUsuariosDto;
import mx.edu.ito.saboresoaxaca.usuario.servicio.AdministracionUsuariosServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/v1/admin/usuarios") @Profile("!bootstrap") @SoloAdmin
public class AdministracionUsuariosControlador {
    private final AdministracionUsuariosServicio servicio;
    public AdministracionUsuariosControlador(AdministracionUsuariosServicio servicio) { this.servicio = servicio; }
    @GetMapping public AdministracionUsuariosDto.Pagina listar(@Valid @ModelAttribute AdministracionUsuariosDto.Filtro filtro) { return servicio.listar(filtro); }
    @GetMapping("/{id}") public AdministracionUsuariosDto.Usuario detalle(@PathVariable long id) { return servicio.detalle(idValido(id)); }
    @PutMapping("/{id}/roles/cocinero") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void asignar(@PathVariable long id) { servicio.cambiarCocinero(idValido(id), true); }
    @DeleteMapping("/{id}/roles/cocinero") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void retirar(@PathVariable long id) { servicio.cambiarCocinero(idValido(id), false); }
    private long idValido(long id) { if (id < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador inválido"); return id; }
}
