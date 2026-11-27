package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.dto.PerfilRespuesta;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import mx.edu.ito.saboresoaxaca.usuario.controlador.SolicitudesCocineroControlador;
import mx.edu.ito.saboresoaxaca.usuario.servicio.SolicitudesCocineroServicio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers=SolicitudesCocineroControlador.class)
@Import(SecurityConfig.class)
class SolicitudesCocineroHttpTest {
    @Autowired MockMvc mvc;
    @MockitoBean SolicitudesCocineroServicio servicio;
    @MockitoBean AutenticacionServicio autenticacion;
    @MockitoBean JwtDecoder decoder;
    @Test void rutasExigenSesionYAdmin() throws Exception {
        for (String rol : List.of("ADMIN", "USUARIO")) {
            Jwt jwt=Jwt.withTokenValue(rol).header("alg","HS256").subject("1").build();
            when(decoder.decode(rol)).thenReturn(jwt);
            when(autenticacion.perfil(jwt)).thenReturn(new PerfilRespuesta(1L,"Ana","ana@ejemplo.invalid",List.of(rol)));
        }
        mvc.perform(get("/api/v1/solicitud-cocinero")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/solicitud-cocinero")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/solicitudes-cocinero").header("Authorization","Bearer USUARIO")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/solicitudes-cocinero/1/aprobar").header("Authorization","Bearer USUARIO")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/solicitudes-cocinero/1/rechazar").header("Authorization","Bearer USUARIO")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/solicitud-cocinero").header("Authorization","Bearer USUARIO")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/solicitudes-cocinero").header("Authorization","Bearer ADMIN")).andExpect(status().isOk());
    }
}
