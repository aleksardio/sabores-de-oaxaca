package mx.edu.ito.saboresoaxaca.receta.repositorio;

import mx.edu.ito.saboresoaxaca.receta.entidad.*;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface RecetaIngredienteRepositorio extends Repository<RecetaIngrediente, RecetaIngredienteId> {
    @Query("select ri from RecetaIngrediente ri join fetch ri.ingrediente where ri.receta.id in :ids order by ri.id.recetaId, ri.orden")
    List<RecetaIngrediente> buscarParaRecetas(@Param("ids") Collection<Long> ids);
}
