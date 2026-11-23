package mx.edu.ito.saboresoaxaca.receta.entidad;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class RecetaCategoriaId implements Serializable {
    @Column(name = "receta_id", nullable = false, columnDefinition = "BIGINT UNSIGNED") private Long recetaId;
    @Column(name = "categoria_id", nullable = false, columnDefinition = "BIGINT UNSIGNED") private Long categoriaId;
    protected RecetaCategoriaId() { }
    public RecetaCategoriaId(Long recetaId, Long categoriaId) { this.recetaId = Objects.requireNonNull(recetaId); this.categoriaId = Objects.requireNonNull(categoriaId); }
    public Long getRecetaId() { return recetaId; }
    public Long getCategoriaId() { return categoriaId; }
    @Override public boolean equals(Object o) { return o instanceof RecetaCategoriaId that && Objects.equals(recetaId, that.recetaId) && Objects.equals(categoriaId, that.categoriaId); }
    @Override public int hashCode() { return Objects.hash(recetaId, categoriaId); }
}
