package mx.edu.ito.saboresoaxaca.usuario.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class UsuarioRolId implements Serializable {
    @Column(name = "usuario_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Long usuarioId;

    @Column(name = "rol_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Long rolId;

    protected UsuarioRolId() { }

    public UsuarioRolId(Long usuarioId, Long rolId) {
        this.usuarioId = Objects.requireNonNull(usuarioId);
        this.rolId = Objects.requireNonNull(rolId);
    }

    public Long getUsuarioId() { return usuarioId; }
    public Long getRolId() { return rolId; }

    @Override
    public boolean equals(Object otro) {
        if (this == otro) return true;
        if (!(otro instanceof UsuarioRolId)) return false;
        UsuarioRolId id = (UsuarioRolId) otro;
        return Objects.equals(usuarioId, id.usuarioId) && Objects.equals(rolId, id.rolId);
    }

    @Override
    public int hashCode() { return Objects.hash(usuarioId, rolId); }
}
