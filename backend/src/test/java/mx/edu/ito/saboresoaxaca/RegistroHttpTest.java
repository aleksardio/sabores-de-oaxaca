package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.controlador.RegistroControlador;
import mx.edu.ito.saboresoaxaca.auth.dto.RegistroRespuesta;
import mx.edu.ito.saboresoaxaca.auth.excepcion.CorreoDuplicadoException;
import mx.edu.ito.saboresoaxaca.auth.servicio.RegistroServicio;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RegistroControlador.class)
@Import(SecurityConfig.class)
class RegistroHttpTest {
    @Autowired MockMvc mvc;
    @MockitoBean RegistroServicio servicio;
    @MockitoBean AutenticacionServicio autenticacionServicio;

    @Test
    void registroPublicoSinSesionNiDatosSensibles() throws Exception {
        when(servicio.registrar(any())).thenReturn(new RegistroRespuesta(1L, "Ana", "ana@ejemplo.invalid"));
        mvc.perform(post("/api/v1/auth/registro").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreVisible\":\"Ana\",\"correo\":\"ana@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.contrasena").doesNotExist()).andExpect(jsonPath("$.contrasenaHash").doesNotExist())
                .andExpect(jsonPath("$.token").doesNotExist()).andExpect(header().doesNotExist("Set-Cookie"));
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void entradaInvalidaYObligatorios() throws Exception {
        mvc.perform(post("/api/v1/auth/registro").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.nombreVisible").exists())
                .andExpect(jsonPath("$.campos.correo").exists()).andExpect(jsonPath("$.campos.contrasena").exists());
        mvc.perform(post("/api/v1/auth/registro").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreVisible\":\"Ana\",\"correo\":\"no-es-correo\",\"contrasena\":\"débil\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.correo").exists())
                .andExpect(jsonPath("$.campos.contrasena").exists());
        verifyNoInteractions(servicio);
    }

    @Test
    void rechazaPropiedadesAdministrativas() throws Exception {
        for (String campo : new String[]{"rol", "roles", "id", "versionTokens", "eliminadoEn"}) {
            mvc.perform(post("/api/v1/auth/registro").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"nombreVisible\":\"Ana\",\"correo\":\"ana@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\",\"" + campo + "\":1}"))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(servicio);
    }

    @Test
    void duplicadoDevuelveConflicto() throws Exception {
        when(servicio.registrar(any())).thenThrow(new CorreoDuplicadoException());
        mvc.perform(post("/api/v1/auth/registro").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreVisible\":\"Ana\",\"correo\":\"ana@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.error").value("El correo ya está registrado"));
    }

    @Test
    void rechazaContrasenaQueExcedeLimiteDeBytesBcrypt() throws Exception {
        String contrasena = "A1!" + "á".repeat(35);
        mvc.perform(post("/api/v1/auth/registro").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreVisible\":\"Ana\",\"correo\":\"ana@ejemplo.invalid\",\"contrasena\":\"" + contrasena + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.contrasena").exists());
        verifyNoInteractions(servicio);
    }
}
