package mx.edu.ito.saboresoaxaca.auth.excepcion;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.dao.OptimisticLockingFailureException;
import jakarta.persistence.OptimisticLockException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ErroresApi {
    @ExceptionHandler({OptimisticLockingFailureException.class, OptimisticLockException.class})
    ResponseEntity<Map<String, Object>> conflictoOptimista() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Los datos cambiaron; vuelva a consultar"));
    }
    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<Map<String, Object>> credencialesInvalidas() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Credenciales inválidas"));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validacion(MethodArgumentNotValidException error) {
        Map<String, String> campos = new LinkedHashMap<>();
        error.getBindingResult().getFieldErrors().forEach(e -> campos.putIfAbsent(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("error", "Datos inválidos", "campos", campos));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> jsonInvalido() {
        return ResponseEntity.badRequest().body(Map.of("error", "JSON inválido o campos no permitidos"));
    }

    @ExceptionHandler(CorreoDuplicadoException.class)
    ResponseEntity<Map<String, Object>> correoDuplicado() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "El correo ya está registrado"));
    }
}
