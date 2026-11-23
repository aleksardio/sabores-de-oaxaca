package mx.edu.ito.saboresoaxaca.usuario.repositorio;

import mx.edu.ito.saboresoaxaca.usuario.entidad.Rol;
import org.springframework.data.repository.Repository;

import java.util.Optional;

public interface RolRepositorio extends Repository<Rol, Long> {
    Optional<Rol> findByCodigo(String codigo);
}
