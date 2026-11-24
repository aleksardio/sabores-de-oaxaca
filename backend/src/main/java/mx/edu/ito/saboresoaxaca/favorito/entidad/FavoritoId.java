package mx.edu.ito.saboresoaxaca.favorito.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class FavoritoId implements Serializable {
    @Column(name = "usuario_id")
    private Long usuarioId;
    @Column(name = "receta_id")
    private Long recetaId;

    protected FavoritoId() { }

    @Override
    public boolean equals(Object otro) {
        return otro instanceof FavoritoId id && Objects.equals(usuarioId, id.usuarioId)
                && Objects.equals(recetaId, id.recetaId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(usuarioId, recetaId);
    }
}
