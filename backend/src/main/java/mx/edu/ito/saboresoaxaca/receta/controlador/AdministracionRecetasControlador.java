package mx.edu.ito.saboresoaxaca.receta.controlador;

import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloAdmin;
import mx.edu.ito.saboresoaxaca.receta.dto.AdministracionRecetasDto;
import mx.edu.ito.saboresoaxaca.receta.servicio.AdministracionRecetasServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/admin/recetas") @Profile("!bootstrap") @SoloAdmin
public class AdministracionRecetasControlador {
    private final AdministracionRecetasServicio servicio;
    public AdministracionRecetasControlador(AdministracionRecetasServicio servicio) { this.servicio=servicio; }
    @GetMapping public AdministracionRecetasDto.Pagina listar(@RequestParam(required=false) String texto,@RequestParam(required=false) String estado,@RequestParam(required=false) Boolean baja,@RequestParam(defaultValue="0") int pagina,@RequestParam(defaultValue="20") int tamano) { return servicio.listar(texto,estado,baja,pagina,tamano); }
    @GetMapping("/{id}") public AdministracionRecetasDto.Receta detalle(@PathVariable long id) { return servicio.detalle(id); }
    @PostMapping("/{id}/baja") public AdministracionRecetasDto.Receta baja(@PathVariable long id,@RequestHeader(value="If-Match",required=false) String version,@RequestBody AdministracionRecetasDto.Accion accion) { return servicio.cambiar(id,version,accion==null ? null : accion.detalle(),false); }
    @PostMapping("/{id}/restaurar") public AdministracionRecetasDto.Receta restaurar(@PathVariable long id,@RequestHeader(value="If-Match",required=false) String version,@RequestBody AdministracionRecetasDto.Accion accion) { return servicio.cambiar(id,version,accion==null ? null : accion.detalle(),true); }
}
