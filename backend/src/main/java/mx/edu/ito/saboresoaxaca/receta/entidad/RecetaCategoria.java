package mx.edu.ito.saboresoaxaca.receta.entidad;

import jakarta.persistence.*;

@Entity @Table(name = "recetas_categorias")
public class RecetaCategoria {
    @EmbeddedId private RecetaCategoriaId id;
    @MapsId("recetaId") @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "receta_id", nullable = false) private Receta receta;
    @MapsId("categoriaId") @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "categoria_id", nullable = false) private Categoria categoria;
    protected RecetaCategoria() { }
    public RecetaCategoria(Receta receta, Categoria categoria) {
        this.receta = receta; this.categoria = categoria; this.id = new RecetaCategoriaId(receta.getId(), categoria.getId());
    }
    public RecetaCategoriaId getId() { return id; }
    public Receta getReceta() { return receta; }
    public Categoria getCategoria() { return categoria; }
}
