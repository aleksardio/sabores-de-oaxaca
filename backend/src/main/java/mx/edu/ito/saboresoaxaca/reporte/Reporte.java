package mx.edu.ito.saboresoaxaca.reporte;

import jakarta.persistence.*;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import java.time.LocalDateTime;

@Entity @Table(name="reportes")
public class Reporte {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) @Column(columnDefinition="BIGINT UNSIGNED") private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="receta_id") private Receta receta;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="reportante_id") private Usuario reportante;
    @Column(nullable=false, length=500) private String motivo;
    @Column(nullable=false, length=20) private String estado;
    @Column(name="creado_en", nullable=false, columnDefinition="DATETIME(6)") private LocalDateTime creadoEn;
    @Column(name="actualizado_en", nullable=false, columnDefinition="DATETIME(6)") private LocalDateTime actualizadoEn;
    @Column(name="resuelto_en", columnDefinition="DATETIME(6)") private LocalDateTime resueltoEn;
    protected Reporte() { }
    public Reporte(Receta receta, Usuario reportante, String motivo, LocalDateTime fecha) {
        this.receta=receta; this.reportante=reportante; this.motivo=motivo; this.estado="ABIERTO"; this.creadoEn=fecha; this.actualizadoEn=fecha;
    }
    public Long getId() { return id; }
    public Receta getReceta() { return receta; }
    public Usuario getReportante() { return reportante; }
    public String getMotivo() { return motivo; }
    public String getEstado() { return estado; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getResueltoEn() { return resueltoEn; }
    public void resolver(String estado, LocalDateTime fecha) { this.estado=estado; this.resueltoEn=fecha; this.actualizadoEn=fecha; }
}
