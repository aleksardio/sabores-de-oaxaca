package mx.edu.ito.saboresoaxaca.usuario.repositorio;

import mx.edu.ito.saboresoaxaca.usuario.entidad.UsuarioRol;
import mx.edu.ito.saboresoaxaca.usuario.entidad.UsuarioRolId;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRolRepositorio extends Repository<UsuarioRol, UsuarioRolId> {
    List<UsuarioRol> findByUsuario_Id(Long usuarioId);
    UsuarioRol save(UsuarioRol usuarioRol);
    Optional<UsuarioRol> findById(UsuarioRolId id);
    void delete(UsuarioRol usuarioRol);
    @Query("select ur from UsuarioRol ur join fetch ur.rol where ur.usuario.id in :ids")
    List<UsuarioRol> buscarRolesDeUsuarios(@Param("ids") Collection<Long> ids);
}
