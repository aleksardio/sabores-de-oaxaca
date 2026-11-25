package mx.edu.ito.saboresoaxaca.reporte;

import jakarta.validation.Valid;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController @Profile("!bootstrap") @RequestMapping("/api/v1")
public class ReportesControlador {
    private final ReportesServicio servicio;
    public ReportesControlador(ReportesServicio servicio) { this.servicio=servicio; }
    @PostMapping("/recetas/{id}/reportes") @ResponseStatus(HttpStatus.CREATED)
    public ReportesDto.Creado crear(@PathVariable Long id,@Valid @RequestBody ReportesDto.Solicitud solicitud) { return servicio.crear(id,solicitud.motivo()); }
    @GetMapping("/moderacion/reportes")
    public ReportesDto.Pagina listar(@RequestParam(defaultValue="0") int pagina,@RequestParam(defaultValue="12") int tamano,@RequestParam(required=false) String estado) { return servicio.listar(pagina,tamano,estado); }
    @GetMapping("/moderacion/reportes/{id}")
    public ReportesDto.Detalle detalle(@PathVariable Long id) { return servicio.detalle(id); }
    @PostMapping("/moderacion/reportes/{id}/descartar")
    public ReportesDto.Detalle descartar(@PathVariable Long id) { return servicio.resolver(id,false); }
    @PostMapping("/moderacion/reportes/{id}/dar-baja")
    public ReportesDto.Detalle baja(@PathVariable Long id) { return servicio.resolver(id,true); }
}
