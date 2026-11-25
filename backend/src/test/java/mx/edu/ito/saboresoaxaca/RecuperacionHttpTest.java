package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.recuperacion.RecuperacionControlador;
import mx.edu.ito.saboresoaxaca.auth.recuperacion.RecuperacionServicio;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers=RecuperacionControlador.class) @Import(SecurityConfig.class)
class RecuperacionHttpTest {
    @Autowired MockMvc mvc;
    @MockitoBean RecuperacionServicio servicio;
    @MockitoBean AutenticacionServicio autenticacion;
    @Test void validacionDevuelve400SinTokenNiContrasenaEnRespuesta() throws Exception {
        mvc.perform(post("/api/v1/auth/recuperar-contrasena").contentType(MediaType.APPLICATION_JSON).content("{\"correo\":\"no es correo\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").exists());
        mvc.perform(post("/api/v1/auth/restablecer-contrasena").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"invalido\",\"contrasena\":\"debil\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").exists());
        verifyNoInteractions(servicio);
    }
    @Test void deshabilitadaDaMismaRespuestaSinDependerDelCorreo() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Recuperación temporalmente no disponible")).when(servicio).solicitar(anyString());
        for (String correo : java.util.List.of("existe@ejemplo.invalid","noexiste@ejemplo.invalid"))
            mvc.perform(post("/api/v1/auth/recuperar-contrasena").contentType(MediaType.APPLICATION_JSON).content("{\"correo\":\""+correo+"\"}"))
                    .andExpect(status().isServiceUnavailable()).andExpect(content().json("{\"error\":\"Recuperación temporalmente no disponible\"}"));
    }
}
