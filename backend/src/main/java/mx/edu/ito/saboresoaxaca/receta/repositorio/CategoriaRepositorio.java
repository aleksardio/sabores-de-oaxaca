package mx.edu.ito.saboresoaxaca.receta.repositorio;

import mx.edu.ito.saboresoaxaca.receta.entidad.Categoria;
import org.springframework.data.repository.Repository;
import java.util.List;

public interface CategoriaRepositorio extends Repository<Categoria, Long> {
    List<Categoria> findAllByOrderByNombreAscIdAsc();
}
