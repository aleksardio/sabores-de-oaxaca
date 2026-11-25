package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.configuracion.AutenticacionJwtConverter;
import mx.edu.ito.saboresoaxaca.auth.dto.PerfilRespuesta;
import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import mx.edu.ito.saboresoaxaca.multimedia.MultimediaServicio;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("bootstrap")
@Import(MultimediaMultipartHttpTest.Configuracion.class)
class MultimediaMultipartHttpTest {
    @TestConfiguration
    static class Configuracion {
        @Bean AutenticacionJwtConverter autenticacionJwtConverter(AutenticacionServicio servicio) {
            return new AutenticacionJwtConverter(servicio);
        }
    }
    @LocalServerPort int puerto;
    @MockitoBean JwtDecoder decoder;
    @MockitoBean AutenticacionServicio autenticacion;
    @MockitoBean MultimediaServicio servicio;
    @Autowired org.springframework.core.env.Environment entorno;

    @Test void limiteRealDelContenedorYRespuesta413() throws Exception {
        assertEquals("31457280B", entorno.getProperty("spring.servlet.multipart.max-file-size"));
        Jwt jwt = Jwt.withTokenValue("cocinero").header("alg", "HS256").subject("1").build();
        when(decoder.decode("cocinero")).thenReturn(jwt);
        when(autenticacion.perfil(jwt)).thenReturn(new PerfilRespuesta(1L, "Ana", "a@ejemplo.com", List.of("COCINERO")));
        when(servicio.guardar(any())).thenReturn(new MultimediaServicio.Respuesta("VIDEO", "https://media.ejemplo.com/uploads/id.mp4", "x.mp4", 31457280));
        HttpClient client = HttpClient.newHttpClient();
        var limite = enviar(client, 31457280);
        assertEquals(201, limite.statusCode(), limite.body());
        verify(servicio, times(1)).guardar(any(MultipartFile.class));
        var excedido = enviar(client, 31457281);
        assertEquals(413, excedido.statusCode(), excedido.body());
        assertEquals("{\"error\":\"Archivo demasiado grande\"}", excedido.body());
        assertEquals("32505856B", entorno.getProperty("spring.servlet.multipart.max-request-size"));
        verify(servicio, times(1)).guardar(any(MultipartFile.class));
    }

    private HttpResponse<String> enviar(HttpClient cliente, int tamano) throws Exception {
        byte[] datos = new byte[tamano];
        byte[] inicio = ("--limite\r\nContent-Disposition: form-data; name=\"archivo\"; filename=\"x.mp4\"\r\nContent-Type: video/mp4\r\n\r\n").getBytes(StandardCharsets.US_ASCII);
        byte[] fin = "\r\n--limite--\r\n".getBytes(StandardCharsets.US_ASCII);
        var cuerpo = HttpRequest.BodyPublishers.concat(HttpRequest.BodyPublishers.ofByteArray(inicio), HttpRequest.BodyPublishers.ofByteArray(datos), HttpRequest.BodyPublishers.ofByteArray(fin));
        var solicitud = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + puerto + "/api/v1/multimedia/uploads"))
                .header("Authorization", "Bearer cocinero").header("Content-Type", "multipart/form-data; boundary=limite").POST(cuerpo).build();
        return cliente.send(solicitud, HttpResponse.BodyHandlers.ofString());
    }
}
