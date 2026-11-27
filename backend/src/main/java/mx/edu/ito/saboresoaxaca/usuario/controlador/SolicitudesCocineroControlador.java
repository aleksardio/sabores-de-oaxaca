package mx.edu.ito.saboresoaxaca.usuario.controlador;

import mx.edu.ito.saboresoaxaca.usuario.servicio.SolicitudesCocineroServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1") @Profile("!bootstrap")
public class SolicitudesCocineroControlador {
    private final SolicitudesCocineroServicio servicio;
    public SolicitudesCocineroControlador(SolicitudesCocineroServicio servicio) { this.servicio=servicio; }
    @GetMapping("/solicitud-cocinero") public java.util.Map<String, SolicitudesCocineroServicio.Solicitud> propia() { return java.util.Collections.singletonMap("solicitud", servicio.propia()); }
    @PostMapping("/solicitud-cocinero") public SolicitudesCocineroServicio.Solicitud solicitar() { return servicio.solicitar(); }
    @GetMapping("/admin/solicitudes-cocinero") public List<SolicitudesCocineroServicio.Solicitud> pendientes(@RequestParam(defaultValue="0") int pagina) { return servicio.pendientes(pagina); }
    @PostMapping("/admin/solicitudes-cocinero/{id}/aprobar") public SolicitudesCocineroServicio.Solicitud aprobar(@PathVariable long id) { return servicio.resolver(id,true); }
    @PostMapping("/admin/solicitudes-cocinero/{id}/rechazar") public SolicitudesCocineroServicio.Solicitud rechazar(@PathVariable long id) { return servicio.resolver(id,false); }
}
