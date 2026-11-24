package mx.edu.ito.saboresoaxaca.favorito.entidad;

import jakarta.persistence.*;
import mx.edu.ito.saboresoaxaca.receta.entidad.Receta;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;

import java.time.LocalDateTime;

@Entity
@Table(name = "favoritos")
public class Favorito {
    @EmbeddedId
    private FavoritoId id;
    @MapsId("usuarioId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
    @MapsId("recetaId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receta_id", nullable = false)
    private Receta receta;
    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    protected Favorito() { }
}
