package mx.edu.ito.saboresoaxaca.receta.controlador;

import mx.edu.ito.saboresoaxaca.receta.dto.RecetaPropiaDto;
import mx.edu.ito.saboresoaxaca.receta.servicio.ConsultaRecetasPropiasServicio;
import mx.edu.ito.saboresoaxaca.receta.servicio.CrearRecetaServicio;
import mx.edu.ito.saboresoaxaca.receta.dto.CrearRecetaSolicitud;
import mx.edu.ito.saboresoaxaca.receta.dto.EditarRecetaSolicitud;
import mx.edu.ito.saboresoaxaca.receta.servicio.EditarRecetaServicio;
import mx.edu.ito.saboresoaxaca.receta.servicio.AccionesEditorialesServicio;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/mis-recetas") @Profile("!bootstrap")
public class ConsultaRecetasPropiasControlador {
    private final ConsultaRecetasPropiasServicio servicio;
    private final CrearRecetaServicio creacion;
    private final EditarRecetaServicio edicion;
    private final AccionesEditorialesServicio acciones;
    public ConsultaRecetasPropiasControlador(ConsultaRecetasPropiasServicio servicio, CrearRecetaServicio creacion, EditarRecetaServicio edicion, AccionesEditorialesServicio acciones) { this.servicio = servicio; this.creacion = creacion; this.edicion = edicion; this.acciones = acciones; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public CrearRecetaSolicitud.Respuesta crear(@RequestBody CrearRecetaSolicitud solicitud) { return creacion.crear(solicitud); }
    @PutMapping("/{id}")
    public CrearRecetaSolicitud.Respuesta editar(@PathVariable Long id, @RequestBody EditarRecetaSolicitud solicitud) { return edicion.editar(id, solicitud); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void baja(@PathVariable Long id, @RequestHeader(value = "If-Match", required = false) String version) { acciones.baja(id, version); }
    @PostMapping("/{id}/enviar-revision")
    public CrearRecetaSolicitud.Respuesta enviarRevision(@PathVariable Long id, @RequestHeader(value = "If-Match", required = false) String version) { return acciones.enviarRevision(id, version); }
    @GetMapping public RecetaPropiaDto.Pagina listar(@RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "12") int tamano) { return servicio.listar(pagina, tamano); }
    @GetMapping("/{id}") public RecetaPropiaDto.Detalle detalle(@PathVariable Long id) { return servicio.detalle(id); }
}
