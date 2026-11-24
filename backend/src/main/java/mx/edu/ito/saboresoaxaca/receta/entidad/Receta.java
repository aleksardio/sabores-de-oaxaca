package mx.edu.ito.saboresoaxaca.receta.entidad;

import jakarta.persistence.*;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import java.time.LocalDateTime;

@Entity
@Table(name = "recetas")
public class Receta {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "autor_id", nullable = false) private Usuario autor;
    @Column(nullable = false, length = 200) private String titulo;
    @Column(nullable = false, columnDefinition = "TEXT") private String descripcion;
    @Column(nullable = false, columnDefinition = "MEDIUMTEXT") private String preparacion;
    @Column(nullable = false, length = 30) private String tipo;
    @Column(nullable = false, length = 20) private String estado;
    @Column(name = "porciones_base", nullable = false, columnDefinition = "INT UNSIGNED") private Integer porcionesBase;
    @Column(name = "creado_en", nullable = false, columnDefinition = "DATETIME(6)") private LocalDateTime creadoEn;
    @Column(name = "actualizado_en", nullable = false, columnDefinition = "DATETIME(6)") private LocalDateTime actualizadoEn;
    @Column(name = "publicado_en", columnDefinition = "DATETIME(6)") private LocalDateTime publicadoEn;
    @Column(name = "eliminado_en", columnDefinition = "DATETIME(6)") private LocalDateTime eliminadoEn;
    @Version @Column(name = "version_receta", nullable = false) private Long versionReceta;
    protected Receta() { }
    public Receta(Usuario autor, String titulo, String descripcion, String preparacion, String tipo, Integer porcionesBase, LocalDateTime ahora) {
        this.autor = autor; this.titulo = titulo; this.descripcion = descripcion; this.preparacion = preparacion;
        this.tipo = tipo; this.porcionesBase = porcionesBase; this.estado = "BORRADOR";
        this.creadoEn = ahora; this.actualizadoEn = ahora;
    }
    public Long getId() { return id; }
    public Usuario getAutor() { return autor; }
    public String getTitulo() { return titulo; }
    public String getDescripcion() { return descripcion; }
    public String getPreparacion() { return preparacion; }
    public String getTipo() { return tipo; }
    public String getEstado() { return estado; }
    public Integer getPorcionesBase() { return porcionesBase; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public LocalDateTime getPublicadoEn() { return publicadoEn; }
    public LocalDateTime getEliminadoEn() { return eliminadoEn; }
    public Long getVersionReceta() { return versionReceta; }
    public void darBaja(LocalDateTime ahora) {
        this.eliminadoEn = ahora;
        this.actualizadoEn = ahora;
    }
    public void enviarRevision(LocalDateTime ahora) {
        this.estado = "PENDIENTE";
        this.actualizadoEn = ahora;
    }
    public void actualizarContenido(String titulo, String descripcion, String preparacion, String tipo, Integer porcionesBase, LocalDateTime ahora) {
        this.titulo = titulo; this.descripcion = descripcion; this.preparacion = preparacion;
        this.tipo = tipo; this.porcionesBase = porcionesBase;
        ahora = ahora.truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        this.actualizadoEn = ahora.isAfter(actualizadoEn) ? ahora : actualizadoEn.plusNanos(1000);
    }
}
