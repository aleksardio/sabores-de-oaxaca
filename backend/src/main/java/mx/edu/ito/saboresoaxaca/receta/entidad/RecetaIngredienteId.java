package mx.edu.ito.saboresoaxaca.receta.entidad;

import jakarta.persistence.*;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class RecetaIngredienteId implements Serializable {
    @Column(name = "receta_id", nullable = false, columnDefinition = "BIGINT UNSIGNED") private Long recetaId;
    @Column(name = "ingrediente_id", nullable = false, columnDefinition = "BIGINT UNSIGNED") private Long ingredienteId;
    protected RecetaIngredienteId() { }
    public RecetaIngredienteId(Long recetaId, Long ingredienteId) { this.recetaId = Objects.requireNonNull(recetaId); this.ingredienteId = Objects.requireNonNull(ingredienteId); }
    public Long getRecetaId() { return recetaId; }
    public Long getIngredienteId() { return ingredienteId; }
    @Override public boolean equals(Object o) { return o instanceof RecetaIngredienteId that && Objects.equals(recetaId, that.recetaId) && Objects.equals(ingredienteId, that.ingredienteId); }
    @Override public int hashCode() { return Objects.hash(recetaId, ingredienteId); }
}
