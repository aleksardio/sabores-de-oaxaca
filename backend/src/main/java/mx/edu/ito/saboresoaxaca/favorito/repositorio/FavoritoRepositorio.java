package mx.edu.ito.saboresoaxaca.favorito.repositorio;

import mx.edu.ito.saboresoaxaca.favorito.entidad.Favorito;
import mx.edu.ito.saboresoaxaca.favorito.entidad.FavoritoId;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FavoritoRepositorio extends Repository<Favorito, FavoritoId> {
    // El fetch del autor se aplica a la receta seleccionada, no a la asociación.
    @Query("""
            select r from Receta r join fetch r.autor a, Favorito f
            where f.receta = r and f.id.usuarioId = :usuarioId
              and r.estado = 'PUBLICADA' and r.eliminadoEn is null and a.eliminadoEn is null
            order by f.creadoEn desc, r.id desc
            """)
    List<Receta> listarVisibles(@Param("usuarioId") long usuarioId);

    // La receta y su autor no pueden volverse invisibles entre esta lectura y el insert.
    @Query(value = """
            SELECT r.id FROM recetas r JOIN usuarios a ON a.id = r.autor_id
            WHERE r.id = :recetaId AND r.estado = 'PUBLICADA'
              AND r.eliminado_en IS NULL AND a.eliminado_en IS NULL
            FOR SHARE
            """, nativeQuery = true)
    Optional<Long> bloquearRecetaVisible(@Param("recetaId") long recetaId);

    @Modifying
    @Query(value = """
            INSERT INTO favoritos (usuario_id, receta_id, creado_en)
            VALUES (:usuarioId, :recetaId, UTC_TIMESTAMP(6))
            ON DUPLICATE KEY UPDATE creado_en = favoritos.creado_en
            """, nativeQuery = true)
    void agregarSiFalta(@Param("usuarioId") long usuarioId, @Param("recetaId") long recetaId);

    @Modifying
    @Query("delete from Favorito f where f.id.usuarioId = :usuarioId and f.id.recetaId = :recetaId")
    void quitar(@Param("usuarioId") long usuarioId, @Param("recetaId") long recetaId);
}
