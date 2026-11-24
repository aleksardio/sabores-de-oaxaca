package mx.edu.ito.saboresoaxaca.receta.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.List;

public final class ModeracionDto {
    private ModeracionDto() { }
    public record Resumen(Long id, String titulo, String tipo, Long autorId, String autor, Long version) { }
    public record Pagina(List<Resumen> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) { }
    public record Detalle(Long id, String titulo, String descripcion, String preparacion, String tipo,
                          int porcionesBase, String estado, Long version, Long autorId, String autor,
                          List<RecetasDto.Categoria> categorias, List<RecetasDto.Ingrediente> ingredientes,
                          List<RecetasDto.Multimedia> multimedia) { }
    public record Rechazo(String motivo) {
        @JsonAnySetter public void desconocido(String nombre, Object valor) { throw new IllegalArgumentException("Campo no permitido"); }
    }
    public record Decision(Long id, String estado, Long version) { }
}
