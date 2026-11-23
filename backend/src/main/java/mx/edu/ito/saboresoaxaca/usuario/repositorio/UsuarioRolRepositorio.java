package mx.edu.ito.saboresoaxaca.usuario.repositorio;

import mx.edu.ito.saboresoaxaca.usuario.entidad.UsuarioRol;
import mx.edu.ito.saboresoaxaca.usuario.entidad.UsuarioRolId;
import org.springframework.data.repository.Repository;

import java.util.List;

public interface UsuarioRolRepositorio extends Repository<UsuarioRol, UsuarioRolId> {
    List<UsuarioRol> findByUsuario_Id(Long usuarioId);
    UsuarioRol save(UsuarioRol usuarioRol);
}
