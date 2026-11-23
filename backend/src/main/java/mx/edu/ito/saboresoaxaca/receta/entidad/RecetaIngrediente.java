package mx.edu.ito.saboresoaxaca.receta.entidad;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity @Table(name = "recetas_ingredientes")
public class RecetaIngrediente {
    @EmbeddedId private RecetaIngredienteId id;
    @MapsId("recetaId") @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "receta_id", nullable = false) private Receta receta;
    @MapsId("ingredienteId") @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ingrediente_id", nullable = false) private Ingrediente ingrediente;
    @Column(precision = 12, scale = 3) private BigDecimal cantidad;
    @Column(nullable = false, length = 30) private String unidad;
    @Column(nullable = false, columnDefinition = "INT UNSIGNED") private Integer orden;
    @Column(length = 255) private String nota;
    protected RecetaIngrediente() { }
    public RecetaIngredienteId getId() { return id; }
    public Receta getReceta() { return receta; }
    public Ingrediente getIngrediente() { return ingrediente; }
    public BigDecimal getCantidad() { return cantidad; }
    public String getUnidad() { return unidad; }
    public Integer getOrden() { return orden; }
    public String getNota() { return nota; }
}
