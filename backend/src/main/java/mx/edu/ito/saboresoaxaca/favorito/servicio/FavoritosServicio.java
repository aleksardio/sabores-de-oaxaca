package mx.edu.ito.saboresoaxaca.favorito.servicio;

import mx.edu.ito.saboresoaxaca.favorito.repositorio.FavoritoRepositorio;
import mx.edu.ito.saboresoaxaca.receta.dto.RecetasDto;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.receta.repositorio.RecetaCategoriaRepositorio;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

@Service
@Profile("!bootstrap")
public class FavoritosServicio {
    private final FavoritoRepositorio favoritos;
    private final RecetaCategoriaRepositorio categorias;

    public FavoritosServicio(FavoritoRepositorio favoritos, RecetaCategoriaRepositorio categorias) {
        this.favoritos = favoritos;
        this.categorias = categorias;
    }

    @Transactional(readOnly = true)
    public List<RecetasDto.Resumen> listar(long usuarioId) {
        var recetas = favoritos.listarVisibles(usuarioId);
        if (recetas.isEmpty()) return List.of();

        var porReceta = new HashMap<Long, List<RecetasDto.Categoria>>();
        for (var relacion : categorias.buscarParaRecetas(recetas.stream().map(Receta::getId).toList())) {
            var categoria = relacion.getCategoria();
            porReceta.computeIfAbsent(relacion.getId().getRecetaId(), id -> new ArrayList<>())
                    .add(new RecetasDto.Categoria(categoria.getId(), categoria.getNombre(), categoria.getDescripcion()));
        }
        return recetas.stream().map(receta -> {
            var autor = receta.getAutor();
            return new RecetasDto.Resumen(receta.getId(), receta.getTitulo(), receta.getDescripcion(),
                    receta.getTipo(), receta.getPorcionesBase(),
                    new RecetasDto.Autor(autor.getId(), autor.getNombreVisible(), autor.getAvatarUrl()),
                    porReceta.getOrDefault(receta.getId(), List.of()));
        }).toList();
    }

    @Transactional
    public void agregar(long usuarioId, long recetaId) {
        if (favoritos.bloquearRecetaVisible(recetaId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Receta no encontrada");
        }
        favoritos.agregarSiFalta(usuarioId, recetaId);
    }

    @Transactional
    public void quitar(long usuarioId, long recetaId) {
        favoritos.quitar(usuarioId, recetaId);
    }
}
