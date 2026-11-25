package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @Profile("!bootstrap") @RequestMapping("/api/v1/auth")
public class RecuperacionControlador {
    private final RecuperacionServicio servicio;
    public RecuperacionControlador(RecuperacionServicio servicio) { this.servicio=servicio; }
    @PostMapping("/recuperar-contrasena")
    public Map<String,String> solicitar(@Valid @RequestBody RecuperacionDto.Solicitud solicitud) {
        servicio.solicitar(solicitud.getCorreo());
        return Map.of("mensaje","Si la cuenta existe, recibirá instrucciones de recuperación");
    }
    @PostMapping("/restablecer-contrasena")
    public Map<String,String> restablecer(@Valid @RequestBody RecuperacionDto.Restablecer solicitud) {
        if (!servicio.restablecer(solicitud.getToken(),solicitud.getContrasena())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Enlace inválido o vencido");
        return Map.of("mensaje","Contraseña actualizada");
    }
}
