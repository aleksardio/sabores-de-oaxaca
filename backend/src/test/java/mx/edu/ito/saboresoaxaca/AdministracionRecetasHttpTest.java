package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.dto.PerfilRespuesta;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import mx.edu.ito.saboresoaxaca.receta.controlador.AdministracionRecetasControlador;
import mx.edu.ito.saboresoaxaca.receta.dto.AdministracionRecetasDto;
import mx.edu.ito.saboresoaxaca.receta.servicio.AdministracionRecetasServicio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers=AdministracionRecetasControlador.class)
@Import(SecurityConfig.class)
class AdministracionRecetasHttpTest {
    @Autowired MockMvc mvc;
    @MockitoBean AdministracionRecetasServicio servicio;
    @MockitoBean AutenticacionServicio autenticacion;
    @MockitoBean JwtDecoder decoder;

    @Test void exigeAdminParaLecturaYAcciones() throws Exception {
        for (String rol : List.of("ADMIN","USUARIO")) {
            Jwt jwt=Jwt.withTokenValue(rol).header("alg","HS256").subject("1").build();
            when(decoder.decode(rol)).thenReturn(jwt);
            when(autenticacion.perfil(jwt)).thenReturn(new PerfilRespuesta(1L,"Ana","a@ejemplo.invalid",List.of(rol)));
        }
        mvc.perform(get("/api/v1/admin/recetas")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/recetas").header("Authorization","Bearer USUARIO")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/recetas/1/baja").header("Authorization","Bearer USUARIO")).andExpect(status().isForbidden());
        when(servicio.listar(any(),any(),any(),eq(0),eq(20))).thenReturn(new AdministracionRecetasDto.Pagina(List.of(),0,20,0,0));
        mvc.perform(get("/api/v1/admin/recetas").header("Authorization","Bearer ADMIN")).andExpect(status().isOk());
    }
}
