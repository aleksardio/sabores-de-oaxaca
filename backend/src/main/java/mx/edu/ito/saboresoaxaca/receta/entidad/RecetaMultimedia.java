package mx.edu.ito.saboresoaxaca.receta.entidad;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name = "recetas_multimedia")
public class RecetaMultimedia {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "receta_id", nullable = false) private Receta receta;
    @Column(nullable = false, length = 10) private String tipo;
    @Column(nullable = false, length = 2048) private String url;
    @Column(name = "texto_alternativo", length = 255) private String textoAlternativo;
    @Column(nullable = false, columnDefinition = "INT UNSIGNED") private Integer orden;
    @Column(name = "creado_en", nullable = false, columnDefinition = "DATETIME(6)") private LocalDateTime creadoEn;
    protected RecetaMultimedia() { }
    public Long getId() { return id; }
    public Receta getReceta() { return receta; }
    public String getTipo() { return tipo; }
    public String getUrl() { return url; }
    public String getTextoAlternativo() { return textoAlternativo; }
    public Integer getOrden() { return orden; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
