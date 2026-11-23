package mx.edu.ito.saboresoaxaca.receta.entidad;

import jakarta.persistence.*;

@Entity @Table(name = "categorias")
public class Categoria {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @Column(nullable = false, unique = true, length = 100) private String nombre;
    @Column(length = 255) private String descripcion;
    protected Categoria() { }
    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getDescripcion() { return descripcion; }
}
