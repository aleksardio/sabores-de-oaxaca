package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes=RecuperacionControlador.class)
public class ErroresRecuperacion {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String,String>> estado(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("error",error.getReason()));
    }
}
