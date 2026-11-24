package mx.edu.ito.saboresoaxaca.receta.controlador;

import mx.edu.ito.saboresoaxaca.receta.dto.RecetasDto;
import mx.edu.ito.saboresoaxaca.receta.servicio.RecetasPublicasServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1") @Profile("!bootstrap")
public class RecetasPublicasControlador {
    private final RecetasPublicasServicio servicio;
    public RecetasPublicasControlador(RecetasPublicasServicio servicio) { this.servicio = servicio; }
    @GetMapping("/recetas")
    public RecetasDto.Pagina catalogo(@RequestParam(required = false) String titulo, @RequestParam(required = false) Long categoria, @RequestParam(required = false) String tipo, @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "12") int tamano) { return servicio.catalogo(titulo, categoria, tipo, pagina, tamano); }
    @GetMapping("/recetas/{id}")
    public RecetasDto.Detalle detalle(@PathVariable Long id, @RequestParam(required = false) Integer porciones) { return servicio.detalle(id, porciones); }
    @GetMapping("/categorias")
    public List<RecetasDto.Categoria> categorias() { return servicio.categorias(); }
    @GetMapping("/ingredientes")
    public List<RecetasDto.IngredienteCatalogo> ingredientes() { return servicio.ingredientes(); }
}
