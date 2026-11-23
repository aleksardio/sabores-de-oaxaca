package mx.edu.ito.saboresoaxaca.usuario.repositorio;

import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import org.springframework.data.repository.Repository;

import java.util.Optional;

public interface UsuarioRepositorio extends Repository<Usuario, Long> {
    Optional<Usuario> findById(Long id);
    Optional<Usuario> findByCorreo(String correo);
    boolean existsByCorreo(String correo);
    Usuario save(Usuario usuario);
}
