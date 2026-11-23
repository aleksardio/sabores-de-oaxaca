package mx.edu.ito.saboresoaxaca.usuario.entidad;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @Column(name = "correo", nullable = false, unique = true, length = 254)
    private String correo;

    @Column(name = "nombre_visible", nullable = false, length = 100)
    private String nombreVisible;

    @JsonIgnore
    @Column(name = "contrasena_hash", nullable = false, length = 255)
    private String contrasenaHash;

    @Column(name = "biografia", length = 1000)
    private String biografia;

    @Column(name = "avatar_url", length = 2048)
    private String avatarUrl;

    @Column(name = "version_tokens", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Long versionTokens = 0L;

    @Column(name = "creado_en", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime creadoEn;

    @Column(name = "actualizado_en", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime actualizadoEn;

    @Column(name = "eliminado_en", columnDefinition = "DATETIME(6)")
    private LocalDateTime eliminadoEn;

    protected Usuario() { }

    public Usuario(String correo, String nombreVisible, String contrasenaHash, LocalDateTime fechaUtc) {
        this.correo = Objects.requireNonNull(correo);
        this.nombreVisible = Objects.requireNonNull(nombreVisible);
        this.contrasenaHash = Objects.requireNonNull(contrasenaHash);
        this.creadoEn = Objects.requireNonNull(fechaUtc);
        this.actualizadoEn = fechaUtc;
    }

    public Long getId() { return id; }
    public String getCorreo() { return correo; }
    public String getNombreVisible() { return nombreVisible; }
    @JsonIgnore
    public String getContrasenaHash() { return contrasenaHash; }
    public String getBiografia() { return biografia; }
    public String getAvatarUrl() { return avatarUrl; }
    public Long getVersionTokens() { return versionTokens; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public LocalDateTime getEliminadoEn() { return eliminadoEn; }
}
