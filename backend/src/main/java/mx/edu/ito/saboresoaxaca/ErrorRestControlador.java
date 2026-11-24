package mx.edu.ito.saboresoaxaca;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

/** Respuesta mínima para errores no resueltos, sin reflejar la excepción original. */
@RestController
class ErrorRestControlador implements ErrorController {
    @RequestMapping("/error")
    ResponseEntity<Map<String, String>> error(HttpServletRequest request) {
        Object atributo = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int codigo = atributo instanceof Integer valor && valor >= 400 && valor <= 599 ? valor : 500;
        String mensaje = codigo >= 500 ? "Error interno del servidor" : "Solicitud inválida";
        return ResponseEntity.status(HttpStatusCode.valueOf(codigo)).body(Map.of("error", mensaje));
    }
}
