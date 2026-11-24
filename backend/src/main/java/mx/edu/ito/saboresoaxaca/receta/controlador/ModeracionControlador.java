package mx.edu.ito.saboresoaxaca.receta.controlador;

import mx.edu.ito.saboresoaxaca.receta.dto.ModeracionDto;
import mx.edu.ito.saboresoaxaca.receta.servicio.ModeracionServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController @Profile("!bootstrap") @RequestMapping("/api/v1/moderacion/recetas")
public class ModeracionControlador {
    private final ModeracionServicio servicio;
    public ModeracionControlador(ModeracionServicio servicio) { this.servicio=servicio; }
    @GetMapping public ModeracionDto.Pagina listar(@RequestParam(defaultValue="0") int pagina,@RequestParam(defaultValue="12") int tamano,@RequestParam(required=false) String tipo) { return servicio.listar(pagina,tamano,tipo); }
    @GetMapping("/{id}") public ModeracionDto.Detalle detalle(@PathVariable Long id) { return servicio.detalle(id); }
    @PostMapping("/{id}/aprobar") public ModeracionDto.Decision aprobar(@PathVariable Long id,@RequestHeader(value="If-Match",required=false) String version) { return servicio.decidir(id,version,true,null); }
    @PostMapping("/{id}/rechazar") public ModeracionDto.Decision rechazar(@PathVariable Long id,@RequestHeader(value="If-Match",required=false) String version,@RequestBody ModeracionDto.Rechazo solicitud) { return servicio.decidir(id,version,false,solicitud == null ? null : solicitud.motivo()); }
}
