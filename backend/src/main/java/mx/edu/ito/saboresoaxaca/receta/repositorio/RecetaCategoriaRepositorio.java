package mx.edu.ito.saboresoaxaca.receta.repositorio;

import mx.edu.ito.saboresoaxaca.receta.entidad.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface RecetaCategoriaRepositorio extends Repository<RecetaCategoria, RecetaCategoriaId> {
    @Query("select rc from RecetaCategoria rc join fetch rc.categoria c where rc.receta.id in :ids order by rc.id.recetaId, c.nombre, c.id")
    List<RecetaCategoria> buscarParaRecetas(@Param("ids") Collection<Long> ids);
}
