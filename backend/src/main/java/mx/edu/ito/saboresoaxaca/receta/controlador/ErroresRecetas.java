package mx.edu.ito.saboresoaxaca.receta.controlador;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice(assignableTypes = {RecetasPublicasControlador.class, ConsultaRecetasPropiasControlador.class})
public class ErroresRecetas {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> estado(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("error", error.getReason() == null ? "Solicitud inválida" : error.getReason()));
    }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Map<String, String>> tipoInvalido() {
        return ResponseEntity.badRequest().body(Map.of("error", "Parámetros inválidos"));
    }
}
