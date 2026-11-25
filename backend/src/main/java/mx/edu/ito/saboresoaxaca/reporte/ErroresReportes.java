package mx.edu.ito.saboresoaxaca.reporte;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice(assignableTypes=ReportesControlador.class)
public class ErroresReportes {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String,String>> estado(ResponseStatusException error) { return ResponseEntity.status(error.getStatusCode()).body(Map.of("error",error.getReason())); }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<Map<String,String>> tipo() { return ResponseEntity.badRequest().body(Map.of("error","Parámetros inválidos")); }
}
