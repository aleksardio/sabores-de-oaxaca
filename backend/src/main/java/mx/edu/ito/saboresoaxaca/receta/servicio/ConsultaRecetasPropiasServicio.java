package mx.edu.ito.saboresoaxaca.receta.servicio;

import mx.edu.ito.saboresoaxaca.auth.autorizacion.Autenticado;
import mx.edu.ito.saboresoaxaca.receta.dto.RecetaPropiaDto;
import mx.edu.ito.saboresoaxaca.receta.dto.RecetasDto;
import mx.edu.ito.saboresoaxaca.receta.repositorio.*;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service @Profile("!bootstrap") @Transactional(readOnly = true)
public class ConsultaRecetasPropiasServicio {
    private final RecetaRepositorio recetas;
    private final RecetaIngredienteRepositorio ingredientes;
    private final RecetaCategoriaRepositorio categorias;
    private final RecetaMultimediaRepositorio multimedia;

    public ConsultaRecetasPropiasServicio(RecetaRepositorio recetas, RecetaIngredienteRepositorio ingredientes,
            RecetaCategoriaRepositorio categorias, RecetaMultimediaRepositorio multimedia) {
        this.recetas = recetas; this.ingredientes = ingredientes; this.categorias = categorias; this.multimedia = multimedia;
    }

    @Autenticado
    public RecetaPropiaDto.Pagina listar(int pagina, int tamano) {
        if (pagina < 0 || tamano < 1 || tamano > 50 || (long) pagina * tamano > Integer.MAX_VALUE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginación inválida");
        var resultado = recetas.buscarPropias(autor(), PageRequest.of(pagina, tamano));
        var contenido = resultado.stream().map(r -> new RecetaPropiaDto.Resumen(r.getId(), r.getTitulo(),
                r.getEstado(), r.getTipo(), r.getPorcionesBase(), r.getVersionReceta(), r.getEliminadoEn())).toList();
        return new RecetaPropiaDto.Pagina(contenido, pagina, tamano, resultado.getTotalElements(), resultado.getTotalPages());
    }

    @Autenticado
    public RecetaPropiaDto.Detalle detalle(Long id) {
        var receta = recetas.buscarPropia(id, autor()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Receta no encontrada"));
        var cats = categorias.buscarParaRecetas(List.of(id)).stream().map(rc -> {
            var c = rc.getCategoria(); return new RecetasDto.Categoria(c.getId(), c.getNombre(), c.getDescripcion());
        }).toList();
        var ings = ingredientes.buscarParaRecetas(List.of(id)).stream().map(ri -> new RecetasDto.Ingrediente(
                ri.getIngrediente().getId(), ri.getIngrediente().getNombre(), ri.getCantidad(), null,
                ri.getUnidad(), ri.getOrden(), ri.getNota())).toList();
        var medios = multimedia.buscarParaRecetas(List.of(id)).stream().map(m -> new RecetasDto.Multimedia(
                m.getId(), m.getTipo(), m.getUrl(), m.getTextoAlternativo(), m.getOrden())).toList();
        return new RecetaPropiaDto.Detalle(receta.getId(), receta.getTitulo(), receta.getDescripcion(),
                receta.getPreparacion(), receta.getEstado(), receta.getTipo(), receta.getPorcionesBase(),
                receta.getVersionReceta(), receta.getEliminadoEn(), cats, ings, medios);
    }

    private static Long autor() {
        return Long.valueOf(SecurityContextHolder.getContext().getAuthentication().getName());
    }
}
