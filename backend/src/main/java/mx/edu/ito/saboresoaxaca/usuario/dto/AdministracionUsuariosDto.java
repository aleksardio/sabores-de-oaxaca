package mx.edu.ito.saboresoaxaca.usuario.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public final class AdministracionUsuariosDto {
    private AdministracionUsuariosDto() { }
    public record Usuario(Long id, String nombreVisible, String correo, boolean activo,
                          LocalDateTime creadoEn, List<String> roles) { }
    public record Pagina(List<Usuario> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) { }
    public record Filtro(@Size(max = 100) String texto,
                         @Pattern(regexp = "ADMIN|MODERADOR|COCINERO|USUARIO") String rol,
                         Boolean activo, @Min(0) Integer pagina, @Min(1) @Max(100) Integer tamano) { }
}
