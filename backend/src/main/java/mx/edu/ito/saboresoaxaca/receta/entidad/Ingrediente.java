package mx.edu.ito.saboresoaxaca.receta.entidad;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name = "ingredientes")
public class Ingrediente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @Column(nullable = false, unique = true, length = 150) private String nombre;
    @Column(name = "creado_en", nullable = false, columnDefinition = "DATETIME(6)") private LocalDateTime creadoEn;
    protected Ingrediente() { }
    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
