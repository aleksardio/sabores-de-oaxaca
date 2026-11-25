package mx.edu.ito.saboresoaxaca.usuario.repositorio;

import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.Optional;

public interface UsuarioRepositorio extends Repository<Usuario, Long> {
    Optional<Usuario> findById(Long id);
    Optional<Usuario> findByCorreo(String correo);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u where u.id = :id")
    Optional<Usuario> buscarParaCambioDeRol(@Param("id") Long id);
    @Query("select u from Usuario u where (:texto is null or lower(u.nombreVisible) like :texto escape '!' or lower(u.correo) like :texto escape '!') and (:activo is null or (:activo = true and u.eliminadoEn is null) or (:activo = false and u.eliminadoEn is not null)) and (:rol is null or exists (select ur from UsuarioRol ur where ur.usuario = u and ur.rol.codigo = :rol))")
    Page<Usuario> buscarAdministracion(@Param("texto") String texto, @Param("activo") Boolean activo, @Param("rol") String rol, Pageable pageable);
    boolean existsByCorreo(String correo);
    Usuario save(Usuario usuario);
    @Modifying
    @Query("update Usuario u set u.versionTokens = u.versionTokens + 1, u.versionPerfil = u.versionPerfil + 1 where u.id = :id and u.eliminadoEn is null and u.versionTokens = :version and u.versionPerfil = :perfil and u.versionTokens < 9223372036854775807 and u.versionPerfil < 9223372036854775807")
    int invalidarTokens(@Param("id") Long id, @Param("version") Long version, @Param("perfil") Long perfil);
}
