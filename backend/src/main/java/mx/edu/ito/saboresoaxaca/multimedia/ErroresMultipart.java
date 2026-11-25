package mx.edu.ito.saboresoaxaca.multimedia;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** Multipart puede fallar antes de identificar el controlador de destino. */
@RestControllerAdvice
public class ErroresMultipart {
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<Map<String, String>> limite() {
        return ResponseEntity.status(413).body(Map.of("error", "Archivo demasiado grande"));
    }
}
