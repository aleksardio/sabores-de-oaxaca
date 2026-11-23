package mx.edu.ito.saboresoaxaca.auth.controlador;

import jakarta.validation.Valid;
import mx.edu.ito.saboresoaxaca.auth.dto.*;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/auth")
@Profile("!bootstrap")
public class AutenticacionControlador {
    private final AutenticacionServicio servicio;
    public AutenticacionControlador(AutenticacionServicio servicio) { this.servicio = servicio; }
    @PostMapping("/login")
    public LoginRespuesta login(@Valid @RequestBody LoginSolicitud solicitud) { return servicio.login(solicitud); }
    @GetMapping("/me")
    public PerfilRespuesta me(@AuthenticationPrincipal Jwt jwt) { return servicio.perfil(jwt); }
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@AuthenticationPrincipal Jwt jwt) { servicio.logout(jwt); }
}
