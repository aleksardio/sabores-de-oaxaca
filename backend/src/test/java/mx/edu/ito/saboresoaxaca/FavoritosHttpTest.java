package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.dto.PerfilRespuesta;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import mx.edu.ito.saboresoaxaca.favorito.controlador.FavoritosControlador;
import mx.edu.ito.saboresoaxaca.favorito.servicio.FavoritosServicio;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = FavoritosControlador.class, properties = "app.cors.allowed-origins=https://web.ejemplo.invalid")
@Import(SecurityConfig.class)
class FavoritosHttpTest {
    private static final String RUTA = "/api/v1/favoritos";
    @Autowired MockMvc mvc;
    @MockitoBean FavoritosServicio favoritos;
    @MockitoBean AutenticacionServicio autenticacion;
    @MockitoBean JwtDecoder decoder;

    @BeforeEach
    void tokens() {
        Jwt activo = Jwt.withTokenValue("activo").header("alg", "HS256").subject("17").build();
        Jwt revocado = Jwt.withTokenValue("revocado").header("alg", "HS256").subject("17").build();
        when(decoder.decode("activo")).thenReturn(activo);
        when(decoder.decode("revocado")).thenReturn(revocado);
        when(decoder.decode("invalido")).thenThrow(new BadJwtException("JWT inválido"));
        when(autenticacion.perfil(activo)).thenReturn(new PerfilRespuesta(17L, "Ana", "ana@ejemplo.invalid", List.of("USUARIO")));
        when(autenticacion.perfil(revocado)).thenThrow(new BadCredentialsException("JWT revocado"));
    }

    private static RequestPostProcessor sesion() {
        return solicitud -> {
            solicitud.addHeader("Authorization", "Bearer activo");
            return solicitud;
        };
    }

    @Test
    void requiereAutenticacionEnLosTresEndpointsYDeniegaOtrosMetodos() throws Exception {
        mvc.perform(get(RUTA)).andExpect(status().isUnauthorized());
        mvc.perform(post(RUTA + "/8")).andExpect(status().isUnauthorized());
        mvc.perform(delete(RUTA + "/8")).andExpect(status().isUnauthorized());
        mvc.perform(put(RUTA + "/8").with(sesion())).andExpect(status().isForbidden());
        mvc.perform(delete(RUTA).with(sesion())).andExpect(status().isForbidden());
        mvc.perform(get(RUTA + "/8").with(sesion())).andExpect(status().isForbidden());
        for (String token : List.of("invalido", "revocado")) {
            mvc.perform(get(RUTA).header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized()).andExpect(content().json("{\"error\":\"No autenticado\"}"));
        }
        verifyNoInteractions(favoritos);
    }

    @Test
    void obtieneIdentidadDelPrincipalYDevuelve204SinCuerpo() throws Exception {
        var sesion = sesion();
        when(favoritos.listar(17)).thenReturn(List.of());
        mvc.perform(get(RUTA).with(sesion)).andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(post(RUTA + "/8").with(sesion)).andExpect(status().isNoContent()).andExpect(content().string(""));
        mvc.perform(delete(RUTA + "/8").with(sesion)).andExpect(status().isNoContent()).andExpect(content().string(""));
        verify(favoritos).listar(17);
        verify(favoritos).agregar(17, 8);
        verify(favoritos).quitar(17, 8);
    }

    @Test
    void rechazaIdsInvalidosYDatosDeIdentidadDelCliente() throws Exception {
        var sesion = sesion();
        for (String id : List.of("0", "-1", "mole", "9223372036854775808", "0x10")) {
            mvc.perform(post(RUTA + "/" + id).with(sesion))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("Identificador de receta inválido"));
            mvc.perform(delete(RUTA + "/" + id).with(sesion)).andExpect(status().isBadRequest());
        }
        mvc.perform(get(RUTA + "?usuarioId=3").with(sesion)).andExpect(status().isBadRequest());
        mvc.perform(post(RUTA + "/8").with(sesion).contentType("application/json").content("{\"usuarioId\":3}"))
                .andExpect(status().isBadRequest());
        mvc.perform(delete(RUTA + "/8?usuarioId=3").with(sesion)).andExpect(status().isBadRequest());
        mvc.perform(delete(RUTA + "/8").with(sesion).contentType("application/x-www-form-urlencoded").content("usuarioId=3"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(favoritos);
    }

    @Test
    void noExplicaPorQueUnaRecetaNoEsVisible() throws Exception {
        doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Receta no encontrada")).when(favoritos).agregar(17, 8);
        mvc.perform(post(RUTA + "/8").with(sesion()))
                .andExpect(status().isNotFound()).andExpect(content().json("{\"error\":\"Receta no encontrada\"}"));
    }

    @Test
    void corsPermiteDeleteSoloEnFavoritosYParaOrigenConfigurado() throws Exception {
        mvc.perform(preflight(RUTA + "/8", "https://web.ejemplo.invalid"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Methods", "POST,DELETE"))
                .andExpect(header().string("Access-Control-Allow-Origin", "https://web.ejemplo.invalid"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Credentials"));
        mvc.perform(preflight("/api/v1/recetas/8", "https://web.ejemplo.invalid")).andExpect(status().isForbidden());
        mvc.perform(preflight(RUTA + "/8", "https://otro.ejemplo.invalid")).andExpect(status().isForbidden());
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder preflight(String ruta, String origen) {
        return options(ruta).header("Origin", origen).header("Access-Control-Request-Method", "DELETE")
                .header("Access-Control-Request-Headers", "Authorization");
    }
}
