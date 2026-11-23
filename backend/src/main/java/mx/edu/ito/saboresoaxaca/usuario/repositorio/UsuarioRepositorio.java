package mx.edu.ito.saboresoaxaca.usuario.repositorio;

import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UsuarioRepositorio extends Repository<Usuario, Long> {
    Optional<Usuario> findById(Long id);
    Optional<Usuario> findByCorreo(String correo);
    boolean existsByCorreo(String correo);
    Usuario save(Usuario usuario);
    @Modifying
    @Query("update Usuario u set u.versionTokens = u.versionTokens + 1, u.versionPerfil = u.versionPerfil + 1 where u.id = :id and u.eliminadoEn is null and u.versionTokens = :version and u.versionPerfil = :perfil and u.versionTokens < 9223372036854775807 and u.versionPerfil < 9223372036854775807")
    int invalidarTokens(@Param("id") Long id, @Param("version") Long version, @Param("perfil") Long perfil);
}
