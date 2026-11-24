package mx.edu.ito.saboresoaxaca.receta.servicio;

import mx.edu.ito.saboresoaxaca.receta.dto.RecetasDto;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.receta.repositorio.*;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service @Profile("!bootstrap") @Transactional(readOnly = true)
public class RecetasPublicasServicio {
    private final RecetaRepositorio recetas;
    private final CategoriaRepositorio categorias;
    private final RecetaCategoriaRepositorio relacionesCategorias;
    private final RecetaIngredienteRepositorio ingredientes;
    private final RecetaMultimediaRepositorio multimedia;
    private final IngredienteRepositorio catalogoIngredientes;
    public RecetasPublicasServicio(RecetaRepositorio recetas, CategoriaRepositorio categorias, RecetaCategoriaRepositorio relacionesCategorias, RecetaIngredienteRepositorio ingredientes, RecetaMultimediaRepositorio multimedia, IngredienteRepositorio catalogoIngredientes) {
        this.recetas = recetas; this.categorias = categorias; this.relacionesCategorias = relacionesCategorias; this.ingredientes = ingredientes; this.multimedia = multimedia; this.catalogoIngredientes = catalogoIngredientes;
    }
    public RecetasDto.Pagina catalogo(String titulo, Long categoria, String tipo, int pagina, int tamano) {
        if (pagina < 0 || tamano < 1 || tamano > 50 || (long) pagina * tamano > Integer.MAX_VALUE || (categoria != null && categoria < 1) || (tipo != null && !List.of("COMUN", "TRADICIONAL_OAXAQUENA").contains(tipo)) || (titulo != null && (titulo.isBlank() || titulo.length() > 200))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filtros inválidos");
        String literal = titulo == null ? null : titulo.replace("!", "!!").replace("%", "!%").replace("_", "!_");
        var resultado = recetas.buscarPublicadas(literal, categoria, tipo, PageRequest.of(pagina, tamano));
        var ids = resultado.getContent().stream().map(Receta::getId).toList();
        Map<Long, List<RecetasDto.Categoria>> porReceta = ids.isEmpty() ? Map.of() : relacionesCategorias.buscarParaRecetas(ids).stream().collect(Collectors.groupingBy(rc -> rc.getId().getRecetaId(), Collectors.mapping(rc -> categoria(rc.getCategoria()), Collectors.toList())));
        var contenido = resultado.getContent().stream().map(r -> new RecetasDto.Resumen(r.getId(), r.getTitulo(), r.getDescripcion(), r.getTipo(), r.getPorcionesBase(), autor(r), porReceta.getOrDefault(r.getId(), List.of()))).toList();
        return new RecetasDto.Pagina(contenido, pagina, tamano, resultado.getTotalElements(), resultado.getTotalPages());
    }
    public RecetasDto.Detalle detalle(Long id, Integer porciones) {
        if (id < 1 || (porciones != null && (porciones < 1 || porciones > 100))) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parámetros inválidos");
        Receta r = recetas.buscarDetallePublico(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Receta no encontrada"));
        var cats = relacionesCategorias.buscarParaRecetas(List.of(id)).stream().map(rc -> categoria(rc.getCategoria())).toList();
        var ings = ingredientes.buscarParaRecetas(List.of(id)).stream().map(ri -> new RecetasDto.Ingrediente(ri.getIngrediente().getId(), ri.getIngrediente().getNombre(), ri.getCantidad(), porciones == null ? null : CalculadoraPorciones.escalar(ri.getCantidad(), r.getPorcionesBase(), porciones), ri.getUnidad(), ri.getOrden(), ri.getNota())).toList();
        var medios = multimedia.buscarParaRecetas(List.of(id)).stream().map(m -> new RecetasDto.Multimedia(m.getId(), m.getTipo(), m.getUrl(), m.getTextoAlternativo(), m.getOrden())).toList();
        return new RecetasDto.Detalle(r.getId(), r.getTitulo(), r.getDescripcion(), r.getPreparacion(), r.getTipo(), r.getPorcionesBase(), porciones, autor(r), cats, ings, medios);
    }
    public List<RecetasDto.Categoria> categorias() { return categorias.findAllByOrderByNombreAscIdAsc().stream().map(RecetasPublicasServicio::categoria).toList(); }
    public List<RecetasDto.IngredienteCatalogo> ingredientes() { return catalogoIngredientes.findAllByOrderByNombreAscIdAsc().stream().map(i -> new RecetasDto.IngredienteCatalogo(i.getId(), i.getNombre())).toList(); }
    private static RecetasDto.Categoria categoria(mx.edu.ito.saboresoaxaca.receta.entidad.Categoria c) { return new RecetasDto.Categoria(c.getId(), c.getNombre(), c.getDescripcion()); }
    private static RecetasDto.Autor autor(Receta r) { var a = r.getAutor(); return new RecetasDto.Autor(a.getId(), a.getNombreVisible(), a.getAvatarUrl()); }
}
