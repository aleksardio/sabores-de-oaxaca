package mx.edu.ito.saboresoaxaca.usuario.entidad;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "usuarios_roles")
public class UsuarioRol {
    @EmbeddedId
    private UsuarioRolId id;

    @MapsId("usuarioId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @MapsId("rolId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rol_id", nullable = false)
    private Rol rol;

    @Column(name = "asignado_en", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime asignadoEn;

    protected UsuarioRol() { }

    public UsuarioRol(Usuario usuario, Rol rol, LocalDateTime asignadoEnUtc) {
        this.usuario = Objects.requireNonNull(usuario);
        this.rol = Objects.requireNonNull(rol);
        this.id = new UsuarioRolId(usuario.getId(), rol.getId());
        this.asignadoEn = Objects.requireNonNull(asignadoEnUtc);
    }

    public UsuarioRolId getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public Rol getRol() { return rol; }
    public LocalDateTime getAsignadoEn() { return asignadoEn; }
}
