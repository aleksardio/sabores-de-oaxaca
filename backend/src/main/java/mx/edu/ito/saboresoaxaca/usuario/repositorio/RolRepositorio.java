package mx.edu.ito.saboresoaxaca.usuario.repositorio;

import mx.edu.ito.saboresoaxaca.usuario.entidad.Rol;
import org.springframework.data.repository.Repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface RolRepositorio extends Repository<Rol, Long> {
    Optional<Rol> findByCodigo(String codigo);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Rol r where r.codigo = :codigo")
    Optional<Rol> bloquearPorCodigo(@Param("codigo") String codigo);
}
