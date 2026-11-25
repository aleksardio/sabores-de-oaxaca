package mx.edu.ito.saboresoaxaca.reporte;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public final class ReportesDto {
    private ReportesDto() { }
    public record Solicitud(@NotBlank @Size(max=500) String motivo) { }
    public record Creado(Long id, Long recetaId, String motivo, String estado, LocalDateTime creadoEn) { }
    public record Detalle(Long id, Long recetaId, String titulo, String motivo, LocalDateTime creadoEn, String reportante, String estado, LocalDateTime resueltoEn) { }
    public record Pagina(List<Detalle> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) { }
}
