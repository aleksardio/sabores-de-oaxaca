package mx.edu.ito.saboresoaxaca.receta.dto;

import java.time.LocalDateTime;
import java.util.List;

public final class AdministracionRecetasDto {
    private AdministracionRecetasDto() { }
    public record Receta(Long id, String titulo, String autor, String estado, LocalDateTime eliminadoEn, LocalDateTime creadoEn, Long version) { }
    public record Pagina(List<Receta> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) { }
    public record Accion(String detalle) { }
}
