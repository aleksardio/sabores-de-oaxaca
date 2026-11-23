package mx.edu.ito.saboresoaxaca.receta.repositorio;

import mx.edu.ito.saboresoaxaca.receta.entidad.RecetaMultimedia;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface RecetaMultimediaRepositorio extends Repository<RecetaMultimedia, Long> {
    @Query("select m from RecetaMultimedia m where m.receta.id in :ids order by m.receta.id, m.orden")
    List<RecetaMultimedia> buscarParaRecetas(@Param("ids") Collection<Long> ids);
}
