package mx.edu.ito.saboresoaxaca.receta.dto;

import java.math.BigDecimal;
import java.util.List;

public final class RecetasDto {
    private RecetasDto() { }
    public record Autor(Long id, String nombreVisible, String avatarUrl) { }
    public record Categoria(Long id, String nombre, String descripcion) { }
    public record Ingrediente(Long id, String nombre, BigDecimal cantidadBase, BigDecimal cantidadAjustada, String unidad, Integer orden, String nota) { }
    public record Multimedia(Long id, String tipo, String url, String textoAlternativo, Integer orden) { }
    public record Resumen(Long id, String titulo, String descripcion, String tipo, Integer porcionesBase, Autor autor, List<Categoria> categorias) { }
    public record Detalle(Long id, String titulo, String descripcion, String preparacion, String tipo, Integer porcionesBase, Integer porcionesSolicitadas, Autor autor, List<Categoria> categorias, List<Ingrediente> ingredientes, List<Multimedia> multimedia) { }
    public record Pagina(List<Resumen> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) { }
}
