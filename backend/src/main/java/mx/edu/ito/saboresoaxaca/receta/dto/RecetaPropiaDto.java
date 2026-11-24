package mx.edu.ito.saboresoaxaca.receta.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class RecetaPropiaDto {
    private RecetaPropiaDto() { }
    public record Resumen(Long id, String titulo, String estado, String tipo, Integer porcionesBase,
                          Long version, LocalDateTime eliminadoEn) { }
    public record Pagina(List<Resumen> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) { }
    public record Detalle(Long id, String titulo, String descripcion, String preparacion, String estado,
                          String tipo, Integer porcionesBase, Long version, LocalDateTime eliminadoEn,
                          List<RecetasDto.Categoria> categorias, List<RecetasDto.Ingrediente> ingredientes,
                          List<RecetasDto.Multimedia> multimedia) { }
}
