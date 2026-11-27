package mx.edu.ito.saboresoaxaca.auth.google;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import mx.edu.ito.saboresoaxaca.auth.dto.LoginRespuesta;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("!bootstrap")
@RequestMapping("/api/v1/auth")
public class GoogleAuthControlador {
    private final GoogleAuthServicio servicio;

    public GoogleAuthControlador(GoogleAuthServicio servicio) {
        this.servicio = servicio;
    }

    public record Solicitud(
        @NotBlank @Size(max = 8192) String credential) {}

    @PostMapping("/google")
    public LoginRespuesta google(
            @Valid @RequestBody Solicitud solicitud) {
        return servicio.entrar(solicitud.credential());
    }
}
