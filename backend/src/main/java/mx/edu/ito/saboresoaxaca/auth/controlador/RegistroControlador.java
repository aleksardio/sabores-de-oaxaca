package mx.edu.ito.saboresoaxaca.auth.controlador;

import jakarta.validation.Valid;
import mx.edu.ito.saboresoaxaca.auth.dto.RegistroRespuesta;
import mx.edu.ito.saboresoaxaca.auth.dto.RegistroSolicitud;
import mx.edu.ito.saboresoaxaca.auth.servicio.RegistroServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Profile("!bootstrap")
public class RegistroControlador {
    private final RegistroServicio servicio;
    public RegistroControlador(RegistroServicio servicio) { this.servicio = servicio; }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistroRespuesta registrar(@Valid @RequestBody RegistroSolicitud solicitud) {
        return servicio.registrar(solicitud);
    }
}
