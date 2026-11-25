package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.dto.PerfilRespuesta;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import mx.edu.ito.saboresoaxaca.multimedia.MultimediaControlador;
import mx.edu.ito.saboresoaxaca.multimedia.MultimediaServicio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = MultimediaControlador.class, properties = "app.cors.allowed-origins=https://web.ejemplo.com")
@Import(SecurityConfig.class)
class MultimediaHttpTest {
    @Autowired MockMvc mvc;
    @MockitoBean MultimediaServicio servicio;
    @MockitoBean AutenticacionServicio autenticacion;
    @MockitoBean JwtDecoder decoder;

    @Test void seguridadYExito() throws Exception {
        Jwt cocinero = Jwt.withTokenValue("cocinero").header("alg", "HS256").subject("1").build();
        Jwt otro = Jwt.withTokenValue("otro").header("alg", "HS256").subject("2").build();
        when(decoder.decode("cocinero")).thenReturn(cocinero);
        when(decoder.decode("otro")).thenReturn(otro);
        when(decoder.decode("invalido")).thenThrow(new BadJwtException("inválido"));
        when(autenticacion.perfil(cocinero)).thenReturn(new PerfilRespuesta(1L,"Ana","a@ejemplo.com",List.of("COCINERO")));
        when(autenticacion.perfil(otro)).thenReturn(new PerfilRespuesta(2L,"Luis","b@ejemplo.com",List.of("ADMIN")));
        var archivo = new MockMultipartFile("archivo", "x.jpg", "image/jpeg", new byte[]{-1,-40,-1});
        String ruta = "/api/v1/multimedia/uploads";
        mvc.perform(multipart(ruta).file(archivo)).andExpect(status().isUnauthorized());
        mvc.perform(multipart(ruta).file(archivo).header("Authorization", "Bearer invalido")).andExpect(status().isUnauthorized());
        mvc.perform(multipart(ruta).file(archivo).header("Authorization", "Bearer otro")).andExpect(status().isForbidden());
        when(servicio.guardar(any())).thenReturn(new MultimediaServicio.Respuesta("IMAGEN", "https://media.ejemplo.com/uploads/id.jpg", "x.jpg", 3));
        mvc.perform(multipart(ruta).file(archivo).header("Authorization", "Bearer cocinero"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.tipo").value("IMAGEN"))
                .andExpect(jsonPath("$.tamanoBytes").value(3));
        mvc.perform(get(ruta).header("Authorization", "Bearer cocinero")).andExpect(status().isForbidden());
        mvc.perform(options(ruta).header("Origin", "https://web.ejemplo.com").header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "authorization,content-type")).andExpect(status().isOk());
        verify(servicio, times(1)).guardar(any());
    }
}
