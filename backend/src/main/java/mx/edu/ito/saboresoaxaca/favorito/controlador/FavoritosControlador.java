package mx.edu.ito.saboresoaxaca.favorito.controlador;

import jakarta.servlet.http.HttpServletRequest;
import mx.edu.ito.saboresoaxaca.favorito.servicio.FavoritosServicio;
import mx.edu.ito.saboresoaxaca.receta.dto.RecetasDto;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@Profile("!bootstrap")
@RequestMapping("/api/v1/favoritos")
public class FavoritosControlador {
    private final FavoritosServicio favoritos;

    public FavoritosControlador(FavoritosServicio favoritos) {
        this.favoritos = favoritos;
    }

    @GetMapping
    public List<RecetasDto.Resumen> listar(JwtAuthenticationToken autenticacion, HttpServletRequest solicitud) throws IOException {
        validarEntrada(solicitud);
        return favoritos.listar(Long.parseLong(autenticacion.getName()));
    }

    @PostMapping("/{recetaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void agregar(JwtAuthenticationToken autenticacion, @PathVariable String recetaId, HttpServletRequest solicitud) throws IOException {
        validarEntrada(solicitud);
        favoritos.agregar(Long.parseLong(autenticacion.getName()), idPositivo(recetaId));
    }

    @DeleteMapping("/{recetaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void quitar(JwtAuthenticationToken autenticacion, @PathVariable String recetaId, HttpServletRequest solicitud) throws IOException {
        validarEntrada(solicitud);
        favoritos.quitar(Long.parseLong(autenticacion.getName()), idPositivo(recetaId));
    }

    private static void validarEntrada(HttpServletRequest solicitud) throws IOException {
        if (solicitud.getQueryString() != null || solicitud.getContentLengthLong() > 0
                || !solicitud.getParameterMap().isEmpty() || solicitud.getInputStream().read() != -1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se admiten parámetros ni cuerpo");
        }
    }

    private static long idPositivo(String valor) {
        try {
            if (valor.matches("[0-9]{1,19}")) {
                long id = Long.parseLong(valor);
                if (id > 0) return id;
            }
        } catch (NumberFormatException ignorada) { /* Fuera del rango de long. */ }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de receta inválido");
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> error(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("error", error.getReason()));
    }
}
