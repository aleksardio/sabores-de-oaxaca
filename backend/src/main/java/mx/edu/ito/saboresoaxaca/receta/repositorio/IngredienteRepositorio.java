package mx.edu.ito.saboresoaxaca.receta.repositorio;

import mx.edu.ito.saboresoaxaca.receta.entidad.Ingrediente;
import org.springframework.data.repository.Repository;
import java.util.List;

public interface IngredienteRepositorio extends Repository<Ingrediente, Long> {
    List<Ingrediente> findAllByOrderByNombreAscIdAsc();
}
