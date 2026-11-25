package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.dto.PerfilRespuesta;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import mx.edu.ito.saboresoaxaca.usuario.controlador.AdministracionUsuariosControlador;
import mx.edu.ito.saboresoaxaca.usuario.dto.AdministracionUsuariosDto;
import mx.edu.ito.saboresoaxaca.usuario.servicio.AdministracionUsuariosServicio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AdministracionUsuariosControlador.class, properties = "app.cors.allowed-origins=https://web.ejemplo.com")
@Import(SecurityConfig.class)
class AdministracionUsuariosHttpTest {
    @Autowired MockMvc mvc;
    @MockitoBean AdministracionUsuariosServicio servicio;
    @MockitoBean AutenticacionServicio autenticacion;
    @MockitoBean JwtDecoder decoder;
    private static final String RUTA = "/api/v1/admin/usuarios";

    @Test void requiereAdminYRestringeGestion() throws Exception {
        for (String rol : List.of("ADMIN", "MODERADOR", "USUARIO", "COCINERO")) {
            Jwt jwt = Jwt.withTokenValue(rol).header("alg", "HS256").subject("1").build();
            when(decoder.decode(rol)).thenReturn(jwt);
            when(autenticacion.perfil(jwt)).thenReturn(new PerfilRespuesta(1L, "Ana", "a@ejemplo.com", List.of(rol)));
        }
        mvc.perform(get(RUTA)).andExpect(status().isUnauthorized());
        for (String rol : List.of("MODERADOR", "USUARIO", "COCINERO")) {
            mvc.perform(get(RUTA).header("Authorization", "Bearer " + rol)).andExpect(status().isForbidden());
            mvc.perform(put(RUTA + "/2/roles/cocinero").header("Authorization", "Bearer " + rol)).andExpect(status().isForbidden());
            mvc.perform(delete(RUTA + "/2/roles/cocinero").header("Authorization", "Bearer " + rol)).andExpect(status().isForbidden());
        }
        when(servicio.listar(any())).thenReturn(new AdministracionUsuariosDto.Pagina(List.of(), 0, 20, 0, 0));
        mvc.perform(get(RUTA).header("Authorization", "Bearer ADMIN")).andExpect(status().isOk()).andExpect(jsonPath("$.contenido").isArray());
        mvc.perform(put(RUTA + "/2/roles/cocinero").header("Authorization", "Bearer ADMIN")).andExpect(status().isNoContent());
        mvc.perform(delete(RUTA + "/2/roles/cocinero").header("Authorization", "Bearer ADMIN")).andExpect(status().isNoContent());
        mvc.perform(put(RUTA + "/2/roles/admin").header("Authorization", "Bearer ADMIN")).andExpect(status().isNotFound());
        mvc.perform(get(RUTA + "?tamano=101").header("Authorization", "Bearer ADMIN")).andExpect(status().isBadRequest());
        mvc.perform(get(RUTA + "?rol=OTRO").header("Authorization", "Bearer ADMIN")).andExpect(status().isBadRequest());
        mvc.perform(options(RUTA + "/2/roles/cocinero").header("Origin", "https://web.ejemplo.com").header("Access-Control-Request-Method", "PUT").header("Access-Control-Request-Headers", "authorization")).andExpect(status().isOk());
    }
}
