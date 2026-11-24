package mx.edu.ito.saboresoaxaca;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static java.util.concurrent.TimeUnit.SECONDS;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "favoritos.mysql.it", matches = "true")
class FavoritosMySqlTest {
    private static final String FAVORITOS = "/favoritos";
    private static final JsonMapper JSON = new JsonMapper();
    private final HttpClient http = HttpClient.newHttpClient();
    private String base;
    private JdbcTemplate jdbc;

    @Test
    void favoritosPersistenPorUsuarioConJwtYVisibilidadPublica() throws Exception {
        String schema = requerido("MYSQL_IT_SCHEMA"), port = System.getenv().getOrDefault("MYSQL_IT_PORT", "3306");
        if (!schema.matches("sabores_oaxaca_it_[a-z0-9_]{1,40}") || !port.matches("[0-9]{1,5}")
                || Integer.parseInt(port) < 1 || Integer.parseInt(port) > 65535) {
            throw new IllegalArgumentException("Esquema o puerto inválido");
        }
        String user = requerido("MYSQL_IT_USERNAME"), password = requerido("MYSQL_IT_PASSWORD");
        String url = "jdbc:mysql://127.0.0.1:" + port + "/" + schema + "?connectionTimeZone=UTC";
        try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) {
            try (var r = s.executeQuery("SELECT DATABASE(), VERSION(), @@version_comment")) {
                assertTrue(r.next());
                assertEquals(schema, r.getString(1));
                assertTrue(r.getString(2).matches("8\\.0\\.(1[6-9]|[2-9][0-9]|[1-9][0-9]{2,})([.-].*)?"));
                assertFalse((r.getString(2) + r.getString(3)).toLowerCase(java.util.Locale.ROOT).contains("mariadb"));
            }
            try (var r = s.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")) {
                assertTrue(r.next());
                assertEquals(0, r.getInt(1), "Se exige un esquema dedicado y vacío");
            }
        }
        byte[] key = new byte[64];
        new SecureRandom().nextBytes(key);
        try (var app = new SpringApplicationBuilder(SaboresDeOaxacaApiApplication.class).run(
                "--spring.profiles.active=dev", "--server.port=0", "--JWT_SECRET_BASE64=" + Base64.getEncoder().encodeToString(key),
                "--spring.datasource.url=" + url, "--spring.datasource.username=" + user, "--spring.datasource.password=" + password,
                "--spring.flyway.enabled=true", "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.clean-disabled=true")) {
            base = "http://127.0.0.1:" + ((WebServerApplicationContext) app).getWebServer().getPort() + "/api/v1";
            jdbc = app.getBean(JdbcTemplate.class);
            long ana = registrar("ana");
            long beto = registrar("beto");
            long autor = registrar("autora");
            long mole = receta(autor, "Mole", "PUBLICADA");
            long salsa = receta(autor, "Salsa", "PUBLICADA");
            long borrador = receta(autor, "Borrador", "BORRADOR");
            long archivada = receta(autor, "Archivada", "ARCHIVADA");
            long eliminada = receta(autor, "Eliminada", "PUBLICADA");
            jdbc.update("UPDATE recetas SET eliminado_en=UTC_TIMESTAMP(6) WHERE id=?", eliminada);
            jdbc.update("INSERT INTO categorias(nombre) VALUES ('Moles')");
            jdbc.update("INSERT INTO recetas_categorias(receta_id,categoria_id) SELECT ?, id FROM categorias WHERE nombre='Moles'", mole);

            String jwtAna = login("ana"), jwtBeto = login("beto");
            for (String metodo : List.of("GET", "POST", "DELETE")) {
                String ruta = metodo.equals("GET") ? FAVORITOS : FAVORITOS + "/" + mole;
                assertEquals(401, enviar(metodo, ruta, null, null).statusCode());
                assertEquals(401, enviar(metodo, ruta, "token-invalido", null).statusCode());
            }
            assertEquals(List.of(), ids(lista(jwtAna)));
            for (long invisible : List.of(borrador, archivada, eliminada, Long.MAX_VALUE)) {
                var respuesta = enviar("POST", FAVORITOS + "/" + invisible, jwtAna, null);
                assertEquals(404, respuesta.statusCode(), respuesta.body());
                assertEquals("Receta no encontrada", JSON.readTree(respuesta.body()).path("error").asString());
            }
            mutacion("POST", mole, jwtAna);
            var fecha = jdbc.queryForMap("SELECT creado_en FROM favoritos WHERE usuario_id=? AND receta_id=?", ana, mole);
            mutacion("POST", mole, jwtAna);
            assertEquals(fecha, jdbc.queryForMap("SELECT creado_en FROM favoritos WHERE usuario_id=? AND receta_id=?", ana, mole));
            assertEquals(1, asociaciones(ana, mole));

            var peticiones = new ArrayList<CompletableFuture<HttpResponse<String>>>();
            for (int i = 0; i < 12; i++) {
                peticiones.add(http.sendAsync(peticion("POST", FAVORITOS + "/" + salsa, jwtAna, null),
                        HttpResponse.BodyHandlers.ofString()));
            }
            for (var peticion : peticiones) {
                var respuesta = peticion.get(30, SECONDS);
                assertEquals(204, respuesta.statusCode(), respuesta.body());
            }
            assertEquals(1, asociaciones(ana, salsa));
            jdbc.update("UPDATE favoritos SET creado_en='2026-01-01 00:00:00' WHERE usuario_id=?", ana);
            assertEquals(List.of(salsa, mole), ids(lista(jwtAna)));
            var resumen = lista(jwtAna).get(1);
            assertEquals("Moles", resumen.path("categorias").get(0).path("nombre").asString());
            assertEquals("autora", resumen.path("autor").path("nombreVisible").asString());
            assertFalse(resumen.path("autor").has("correo"));
            assertFalse(resumen.path("autor").has("contrasenaHash"));

            assertEquals(List.of(), ids(lista(jwtBeto)));
            mutacion("DELETE", salsa, jwtBeto);
            assertEquals(1, asociaciones(ana, salsa));
            mutacion("POST", mole, jwtBeto);
            assertEquals(List.of(mole), ids(lista(jwtBeto)));
            mutacion("DELETE", mole, jwtAna);
            mutacion("DELETE", mole, jwtAna);
            assertEquals(0, asociaciones(ana, mole));
            assertEquals(1, asociaciones(beto, mole));

            jdbc.update("UPDATE recetas SET estado='ARCHIVADA' WHERE id=?", salsa);
            assertEquals(List.of(), ids(lista(jwtAna)));
            assertEquals(1, asociaciones(ana, salsa));
            assertEquals(404, enviar("POST", FAVORITOS + "/" + salsa, jwtAna, null).statusCode());
            jdbc.update("UPDATE recetas SET estado='PUBLICADA' WHERE id=?", salsa);
            assertEquals(List.of(salsa), ids(lista(jwtAna)));
            jdbc.update("UPDATE recetas SET eliminado_en=UTC_TIMESTAMP(6) WHERE id=?", salsa);
            assertEquals(List.of(), ids(lista(jwtAna)));
            assertEquals(1, asociaciones(ana, salsa));
            jdbc.update("UPDATE recetas SET eliminado_en=NULL WHERE id=?", salsa);
            jdbc.update("UPDATE usuarios SET eliminado_en=UTC_TIMESTAMP(6) WHERE id=?", autor);
            assertEquals(List.of(), ids(lista(jwtAna)));
            assertEquals(1, asociaciones(ana, salsa));
            assertEquals(404, enviar("POST", FAVORITOS + "/" + mole, jwtAna, null).statusCode());
            mutacion("DELETE", mole, jwtBeto);
            assertEquals(0, asociaciones(beto, mole));
            jdbc.update("UPDATE usuarios SET eliminado_en=NULL WHERE id=?", autor);
            assertEquals(List.of(salsa), ids(lista(jwtAna)));

            assertEquals(204, enviar("POST", "/auth/logout", jwtAna, null).statusCode());
            assertEquals(401, enviar("GET", FAVORITOS, jwtAna, null).statusCode());
            assertEquals(401, enviar("DELETE", FAVORITOS + "/" + salsa, jwtAna, null).statusCode());
            String jwtNuevo = login("ana");
            assertEquals(List.of(salsa), ids(lista(jwtNuevo)));
            jdbc.update("UPDATE usuarios SET eliminado_en=UTC_TIMESTAMP(6) WHERE id=?", ana);
            assertEquals(401, enviar("GET", FAVORITOS, jwtNuevo, null).statusCode());
            assertEquals(401, enviar("POST", FAVORITOS + "/" + mole, jwtNuevo, null).statusCode());
            assertEquals(1, asociaciones(ana, salsa));
        }
    }

    private long receta(long autor, String titulo, String estado) {
        jdbc.update("""
                INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en)
                VALUES (?,?,'Descripción','Preparación','COMUN',?,4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
                """, autor, titulo, estado);
        return jdbc.queryForObject("SELECT id FROM recetas WHERE titulo=?", Long.class, titulo);
    }

    private long registrar(String nombre) throws Exception {
        var respuesta = enviar("POST", "/auth/registro", null,
                "{\"nombreVisible\":\"%1$s\",\"correo\":\"%1$s@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}".formatted(nombre));
        assertEquals(201, respuesta.statusCode(), respuesta.body());
        return JSON.readTree(respuesta.body()).path("id").asLong();
    }

    private String login(String nombre) throws Exception {
        var respuesta = enviar("POST", "/auth/login", null,
                "{\"correo\":\"%s@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}".formatted(nombre));
        assertEquals(200, respuesta.statusCode(), respuesta.body());
        return JSON.readTree(respuesta.body()).path("token").asString();
    }

    private int asociaciones(long usuario, long receta) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM favoritos WHERE usuario_id=? AND receta_id=?", Integer.class, usuario, receta);
    }

    private JsonNode lista(String jwt) throws Exception {
        var respuesta = enviar("GET", FAVORITOS, jwt, null);
        assertEquals(200, respuesta.statusCode(), respuesta.body());
        var lista = JSON.readTree(respuesta.body());
        assertTrue(lista.isArray());
        return lista;
    }

    private static List<Long> ids(JsonNode recetas) {
        var ids = new ArrayList<Long>();
        recetas.forEach(receta -> ids.add(receta.path("id").asLong()));
        return ids;
    }

    private void mutacion(String metodo, long receta, String jwt) throws Exception {
        var respuesta = enviar(metodo, FAVORITOS + "/" + receta, jwt, null);
        assertEquals(204, respuesta.statusCode(), respuesta.body());
        assertEquals("", respuesta.body());
    }

    private HttpResponse<String> enviar(String metodo, String ruta, String jwt, String cuerpo) throws Exception {
        return http.send(peticion(metodo, ruta, jwt, cuerpo), HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest peticion(String metodo, String ruta, String jwt, String cuerpo) {
        var builder = HttpRequest.newBuilder(URI.create(base + ruta)).timeout(Duration.ofSeconds(20));
        if (jwt != null) builder.header("Authorization", "Bearer " + jwt);
        if (cuerpo != null) builder.header("Content-Type", "application/json");
        return builder.method(metodo, cuerpo == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(cuerpo)).build();
    }

    private static String requerido(String nombre) {
        String valor = System.getenv(nombre);
        if (valor == null || valor.isBlank()) throw new IllegalStateException("Falta " + nombre);
        return valor;
    }
}
