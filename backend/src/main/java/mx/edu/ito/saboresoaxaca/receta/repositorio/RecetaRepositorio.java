package mx.edu.ito.saboresoaxaca.receta.repositorio;

import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface RecetaRepositorio extends Repository<Receta, Long> {
    @Query(value = "select r from Receta r join fetch r.autor a where r.estado = 'PUBLICADA' and r.eliminadoEn is null and a.eliminadoEn is null and (:titulo is null or lower(r.titulo) like lower(concat('%', :titulo, '%')) escape '!') and (:tipo is null or r.tipo = :tipo) and (:categoria is null or exists (select rc.id from RecetaCategoria rc where rc.receta = r and rc.categoria.id = :categoria)) order by r.id asc",
           countQuery = "select count(r) from Receta r join r.autor a where r.estado = 'PUBLICADA' and r.eliminadoEn is null and a.eliminadoEn is null and (:titulo is null or lower(r.titulo) like lower(concat('%', :titulo, '%')) escape '!') and (:tipo is null or r.tipo = :tipo) and (:categoria is null or exists (select rc.id from RecetaCategoria rc where rc.receta = r and rc.categoria.id = :categoria))")
    Page<Receta> buscarPublicadas(@Param("titulo") String titulo, @Param("categoria") Long categoria, @Param("tipo") String tipo, Pageable pagina);

    @Query("select r from Receta r join fetch r.autor a where r.id = :id and r.estado = 'PUBLICADA' and r.eliminadoEn is null and a.eliminadoEn is null")
    Optional<Receta> buscarDetallePublico(@Param("id") Long id);
}
