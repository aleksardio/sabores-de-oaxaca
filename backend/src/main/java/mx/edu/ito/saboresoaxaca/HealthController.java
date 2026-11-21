package mx.edu.ito.saboresoaxaca;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class HealthController {

    @GetMapping("/api/v1/public/health")
    HealthResponse health() {
        return new HealthResponse("OK", "Sabores de Oaxaca", "backend");
    }

    record HealthResponse(String estado, String aplicacion, String modulo) {
    }
}
