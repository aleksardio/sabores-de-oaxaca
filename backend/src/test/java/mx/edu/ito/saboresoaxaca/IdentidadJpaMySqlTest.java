package mx.edu.ito.saboresoaxaca;

import jakarta.persistence.EntityManager;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Rol;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import mx.edu.ito.saboresoaxaca.usuario.entidad.UsuarioRol;
import mx.edu.ito.saboresoaxaca.usuario.entidad.UsuarioRolId;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.RolRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRolRepositorio;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.security.SecureRandom;
import java.util.Base64;
import java.time.Instant;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import mx.edu.ito.saboresoaxaca.auth.configuracion.AutenticacionJwtConverter;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.core.GrantedAuthority;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

/** Requiere un esquema local dedicado y vacío; nunca usa bootstrap ni Flyway clean. */
@EnabledIfSystemProperty(named = "jpa.mysql.it", matches = "true")
class IdentidadJpaMySqlTest {
    private static final org.springframework.mail.javamail.JavaMailSender correoSimulado = org.mockito.Mockito.mock(org.springframework.mail.javamail.JavaMailSender.class);
    private static ConfigurableApplicationContext context;
    private static TransactionTemplate tx;
    private static EntityManager em;
    private static UsuarioRepositorio usuarios;
    private static RolRepositorio roles;
    private static UsuarioRolRepositorio asignaciones;
    private static byte[] claveJwt;
    private static String urlPrueba, usuarioPrueba, passwordPrueba;

    @BeforeAll
    static void iniciar() throws SQLException {
        org.mockito.Mockito.when(correoSimulado.createMimeMessage()).thenAnswer(invocacion ->
                new jakarta.mail.internet.MimeMessage(jakarta.mail.Session.getInstance(new java.util.Properties())));
        String schema = requerido("MYSQL_IT_SCHEMA");
        if (!schema.matches("sabores_oaxaca_it_[a-z0-9_]{1,40}")) {
            throw new IllegalArgumentException("Se requiere un esquema dedicado sabores_oaxaca_it_<nombre>");
        }
        String port = System.getenv().getOrDefault("MYSQL_IT_PORT", "3306");
        if (!port.matches("[0-9]{1,5}") || Integer.parseInt(port) < 1 || Integer.parseInt(port) > 65535) {
            throw new IllegalArgumentException("MYSQL_IT_PORT inválido");
        }
        String user = requerido("MYSQL_IT_USERNAME");
        String password = requerido("MYSQL_IT_PASSWORD");
        String url = "jdbc:mysql://127.0.0.1:" + port + "/" + schema + "?connectionTimeZone=UTC";
        urlPrueba = url;
        usuarioPrueba = user;
        passwordPrueba = password;
        try (Connection c = DriverManager.getConnection(url, user, password); Statement s = c.createStatement()) {
            try (ResultSet r = s.executeQuery("SELECT DATABASE(), VERSION(), @@version_comment")) {
                assertTrue(r.next());
                assertEquals(schema, r.getString(1));
                assertTrue(r.getString(2).matches("8\\.0\\.(1[6-9]|[2-9][0-9]|[1-9][0-9]{2,})([.-].*)?"));
                assertFalse((r.getString(2) + r.getString(3)).toLowerCase().contains("mariadb"));
            }
            try (ResultSet r = s.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")) {
                assertTrue(r.next());
                assertEquals(0, r.getInt(1), "Se requiere un esquema vacío; no se borran tablas existentes");
            }
        }
        // Las propiedades de mayor precedencia evitan usar DB_* o perfiles externos accidentalmente.
        claveJwt = new byte[64];
        new SecureRandom().nextBytes(claveJwt);
        context = new SpringApplicationBuilder(SaboresDeOaxacaApiApplication.class)
                .initializers(c -> c.getBeanFactory().registerSingleton("correoSimuladoPrueba", correoSimulado)).run(
                "--spring.profiles.active=dev", "--server.port=0",
                "--JWT_SECRET_BASE64=" + Base64.getEncoder().encodeToString(claveJwt),
                "--spring.datasource.url=" + url, "--spring.datasource.username=" + user,
                "--spring.datasource.password=" + password, "--spring.flyway.enabled=true",
                "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.clean-disabled=true",
                "--app.recuperacion.remitente=pruebas@ejemplo.invalid", "--app.recuperacion.habilitada=true");
        tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        em = context.getBean(EntityManager.class);
        usuarios = context.getBean(UsuarioRepositorio.class);
        roles = context.getBean(RolRepositorio.class);
        asignaciones = context.getBean(UsuarioRolRepositorio.class);
    }

    private static String requerido(String nombre) {
        String valor = System.getenv(nombre);
        if (valor == null || valor.isBlank()) throw new IllegalStateException("Falta " + nombre);
        return valor;
    }

    @AfterAll
    static void cerrar() {
        if (context != null) context.close();
    }

    @Test
    void rolesPersistenciaYClaveCompuesta() {
        tx.executeWithoutResult(status -> {
            Set<String> codigos = Set.of("ADMIN", "MODERADOR", "COCINERO", "USUARIO");
            assertEquals(codigos, codigos.stream().map(c -> roles.findByCodigo(c).orElseThrow().getCodigo()).collect(Collectors.toSet()));
            assertTrue(roles.findByCodigo("NO_EXISTE").isEmpty());
            LocalDateTime fecha = LocalDateTime.of(2026, 1, 2, 3, 4, 5, 123456000);
            Usuario usuario = usuarios.save(new Usuario("cocinero@ejemplo.invalid", "Cocinera", "hash-de-prueba", fecha));
            Rol rol = roles.findByCodigo("COCINERO").orElseThrow();
            UsuarioRol guardado = asignaciones.save(new UsuarioRol(usuario, rol, fecha));
            em.flush();
            UsuarioRolId id = new UsuarioRolId(usuario.getId(), rol.getId());
            assertEquals(id, guardado.getId());
            assertEquals(id.hashCode(), guardado.getId().hashCode());
            em.clear();
            assertTrue(usuarios.existsByCorreo("cocinero@ejemplo.invalid"));
            assertEquals(usuario.getId(), usuarios.findByCorreo("cocinero@ejemplo.invalid").orElseThrow().getId());
            assertEquals(fecha, usuarios.findById(usuario.getId()).orElseThrow().getCreadoEn());
            UsuarioRol leido = asignaciones.findByUsuario_Id(usuario.getId()).get(0);
            assertEquals(id, leido.getId());
            assertEquals("COCINERO", leido.getRol().getCodigo());
            assertEquals(fecha, leido.getAsignadoEn());
            status.setRollbackOnly();
        });
    }

    @Test
    void unicidadCorreoYAsignacion() {
        tx.executeWithoutResult(status -> {
            Usuario usuario = usuarios.save(new Usuario("duplicado@ejemplo.invalid", "Prueba", "hash-de-prueba", LocalDateTime.of(2026, 1, 1, 0, 0)));
            Rol rol = roles.findByCodigo("USUARIO").orElseThrow();
            em.persist(new UsuarioRol(usuario, rol, LocalDateTime.of(2026, 1, 1, 0, 0)));
            em.flush();
            em.clear();
            // Evita que merge convierta el duplicado en una actualización.
            UsuarioRol duplicado = new UsuarioRol(em.getReference(Usuario.class, usuario.getId()), em.getReference(Rol.class, rol.getId()), LocalDateTime.of(2026, 1, 1, 0, 0));
            RuntimeException error = assertThrows(RuntimeException.class, () -> { em.persist(duplicado); em.flush(); });
            assertDuplicado(error);
            status.setRollbackOnly();
        });
        RuntimeException error = assertThrows(RuntimeException.class, () -> tx.executeWithoutResult(status -> {
            LocalDateTime fecha = LocalDateTime.of(2026, 1, 1, 0, 0);
            usuarios.save(new Usuario("unico@ejemplo.invalid", "Primero", "hash-uno", fecha));
            usuarios.save(new Usuario("UNICO@ejemplo.invalid", "Segundo", "hash-dos", fecha));
            em.flush();
            status.setRollbackOnly();
        }));
        assertDuplicado(error);
    }

    private static void assertDuplicado(Throwable error) {
        for (Throwable causa = error; causa != null; causa = causa.getCause()) {
            if (causa instanceof SQLException && ((SQLException) causa).getErrorCode() == 1062) return;
        }
        fail("Se esperaba error MySQL 1062 de clave duplicada", error);
    }

    @Test
    void hibernateValidaYFlywayAplicaSoloLasMigracionesPrevistas() {
        assertEquals("validate", context.getEnvironment().getProperty("spring.jpa.hibernate.ddl-auto"));
        tx.executeWithoutResult(status -> {
            Number migraciones = (Number) em.createNativeQuery("SELECT COUNT(*) FROM flyway_schema_history WHERE success=1 AND version IN ('1','2','3','4','5','6')").getSingleResult();
            Number tablas = (Number) em.createNativeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'").getSingleResult();
            assertEquals(6, migraciones.intValue());
            assertEquals(15, tablas.intValue());
            status.setRollbackOnly();
        });
    }

    @Test
    void perfilDevRechazaClavesAusenteInvalidaOCorta() {
        // El contexto principal ya demuestra el arranque dev con la clave aleatoria válida.
        for (String clave : List.of("", "base64-invalido!", Base64.getEncoder().encodeToString(new byte[16]))) {
            Exception fallo = assertThrows(Exception.class, () -> {
                try (var ignored = new SpringApplicationBuilder(SaboresDeOaxacaApiApplication.class).run(
                        "--spring.profiles.active=dev", "--server.port=0", "--JWT_SECRET_BASE64=" + clave,
                        "--spring.datasource.url=" + urlPrueba, "--spring.datasource.username=" + usuarioPrueba,
                        "--spring.datasource.password=" + passwordPrueba, "--spring.flyway.enabled=true",
                        "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.clean-disabled=true")) { }
            });
            assertTrue(java.util.stream.Stream.iterate((Throwable) fallo, java.util.Objects::nonNull, Throwable::getCause)
                    .anyMatch(causa -> causa.getMessage() != null && causa.getMessage().contains("JWT_SECRET_BASE64")));
        }
    }

    @Test
    void registroHttpRealGuardaBcryptYRolYRechazaDuplicado() throws Exception {
        int port = ((WebServerApplicationContext) context).getWebServer().getPort();
        String cuerpo = "{\"nombreVisible\":\" Ana \u00c1lvarez \" ,\"correo\":\"  ANA@ejemplo.invalid  \",\"contrasena\":\"Ejemplo1!\"}";
        HttpClient cliente = HttpClient.newHttpClient();
        HttpRequest peticion = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/auth/registro"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build();
        HttpResponse<String> respuesta = cliente.send(peticion, HttpResponse.BodyHandlers.ofString());
        assertEquals(201, respuesta.statusCode(), respuesta.body());
        assertTrue(respuesta.body().contains("ana@ejemplo.invalid"));
        assertFalse(respuesta.body().contains("Ejemplo1!"));
        assertFalse(respuesta.body().contains("contrasena"));
        assertEquals(409, cliente.send(peticion, HttpResponse.BodyHandlers.ofString()).statusCode());
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        String hash = jdbc.queryForObject("SELECT contrasena_hash FROM usuarios WHERE correo=?", String.class, "ana@ejemplo.invalid");
        assertNotNull(hash);
        assertNotEquals("Ejemplo1!", hash);
        assertTrue(hash.startsWith("$2"));
        assertTrue(context.getBean(PasswordEncoder.class).matches("Ejemplo1!", hash));
        List<String> roles = jdbc.queryForList("SELECT r.codigo FROM roles r JOIN usuarios_roles ur ON ur.rol_id=r.id JOIN usuarios u ON u.id=ur.usuario_id WHERE u.correo=?", String.class, "ana@ejemplo.invalid");
        assertEquals(List.of("USUARIO"), roles);
        assertEquals(0L, jdbc.queryForObject("SELECT version_tokens FROM usuarios WHERE correo=?", Long.class, "ana@ejemplo.invalid"));
    }

    @Test
    void solicitudesSimultaneasNoDuplicanElCorreo() {
        int port = ((WebServerApplicationContext) context).getWebServer().getPort();
        String cuerpo = "{\"nombreVisible\":\"Prueba\",\"correo\":\"concurrente@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}";
        HttpClient cliente = HttpClient.newHttpClient();
        HttpRequest peticion = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/auth/registro"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build();
        var primera = cliente.sendAsync(peticion, HttpResponse.BodyHandlers.ofString());
        var segunda = cliente.sendAsync(peticion, HttpResponse.BodyHandlers.ofString());
        assertEquals(Set.of(201, 409), Set.of(primera.join().statusCode(), segunda.join().statusCode()));
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM usuarios WHERE correo=?", Integer.class, "concurrente@ejemplo.invalid"));
    }

    @Test
    void loginJwtYEstadoVigente() throws Exception {
        int port = ((WebServerApplicationContext) context).getWebServer().getPort();
        String base = "http://127.0.0.1:" + port + "/api/v1/auth/";
        HttpClient client = HttpClient.newHttpClient();
        String correo = "jwt@ejemplo.invalid";
        String registro = "{\"nombreVisible\":\"Jwt\",\"correo\":\"" + correo + "\",\"contrasena\":\"Ejemplo1!\"}";
        assertEquals(201, enviar(client, base + "registro", registro, null).statusCode());
        String login = "{\"correo\":\" JWT@EJEMPLO.INVALID \",\"contrasena\":\"Ejemplo1!\"}";
        var respuesta = enviar(client, base + "login", login, null);
        assertEquals(200, respuesta.statusCode(), respuesta.body());
        assertTrue(respuesta.headers().allValues("Set-Cookie").isEmpty());
        assertFalse(respuesta.body().contains("Ejemplo1!"));
        assertFalse(respuesta.body().contains("contrasena"));
        var matcher = java.util.regex.Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"").matcher(respuesta.body());
        assertTrue(matcher.find(), respuesta.body());
        String token = matcher.group(1);
        assertEquals(401, enviar(client, base + "me", null, null).statusCode());
        var me = enviar(client, base + "me", null, token);
        assertEquals(200, me.statusCode(), me.body());
        assertTrue(me.headers().allValues("Set-Cookie").isEmpty());
        assertTrue(me.body().contains("USUARIO"));
        assertFalse(me.body().contains("contrasena"));
        assertEquals(401, enviar(client, base + "login", login.replace("Ejemplo1!", "Incorrecta1!"), null).statusCode());
        assertEquals(401, enviar(client, base + "login", login.replace("JWT@EJEMPLO.INVALID", "nadie@ejemplo.invalid"), null).statusCode());
        assertEquals(400, enviar(client, base + "login", "{", null).statusCode());
        assertEquals(400, enviar(client, base + "login", "{}", null).statusCode());
        assertEquals(401, enviar(client, base + "me", null, token.substring(0, token.length() - 5) + "abcde").statusCode());
        String algNone = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"none\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8)) + "." + token.split("\\.")[1] + ".";
        assertEquals(401, enviar(client, base + "me", null, algNone).statusCode());
        assertEquals(403, enviar(client, base + "inexistente", null, token).statusCode());
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        Long id = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo=?", Long.class, correo);
        Instant ahora = Instant.now();
        var decoder = context.getBean(JwtDecoder.class);
        var converter = context.getBean(AutenticacionJwtConverter.class);
        var jwt = decoder.decode(token);
        assertEquals(Set.of("ROLE_USUARIO"), converter.convert(jwt).getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet()));
        var hs512 = new SignedJWT(new JWSHeader(JWSAlgorithm.HS512), new JWTClaimsSet.Builder().subject(id.toString())
                .issuer("sabores-oaxaca-api").audience("sabores-oaxaca-web").issueTime(Date.from(ahora.minusSeconds(1)))
                .expirationTime(Date.from(ahora.plusSeconds(60))).claim("version_tokens", 0).build());
        hs512.sign(new MACSigner(claveJwt));
        assertTrue(hs512.verify(new MACVerifier(claveJwt)));
        assertEquals(401, enviar(client, base + "me", null, hs512.serialize()).statusCode());
        assertEquals(200, enviar(client, base + "me", null, token(id, ahora.minusSeconds(10), ahora.plusSeconds(60), "sabores-oaxaca-api", "sabores-oaxaca-web")).statusCode());
        assertEquals(401, enviar(client, base + "me", null, token(id, ahora.plusSeconds(60), ahora.plusSeconds(120), "sabores-oaxaca-api", "sabores-oaxaca-web")).statusCode());
        var incoherente = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), new JWTClaimsSet.Builder().subject(id.toString())
                .issuer("sabores-oaxaca-api").audience("sabores-oaxaca-web").issueTime(Date.from(ahora.minusSeconds(1)))
                .expirationTime(Date.from(ahora.minusSeconds(2))).claim("version_tokens", 0).build());
        incoherente.sign(new MACSigner(claveJwt));
        assertEquals(401, enviar(client, base + "me", null, incoherente.serialize()).statusCode());
        assertEquals(401, enviar(client, base + "me", null, token(id, ahora.minusSeconds(120), ahora.minusSeconds(60), "sabores-oaxaca-api", "sabores-oaxaca-web")).statusCode());
        assertEquals(401, enviar(client, base + "me", null, token(id, ahora.minusSeconds(1), ahora.plusSeconds(60), "otro", "sabores-oaxaca-web")).statusCode());
        assertEquals(401, enviar(client, base + "me", null, token(id, ahora.minusSeconds(1), ahora.plusSeconds(60), "sabores-oaxaca-api", "otra")).statusCode());
        jdbc.update("INSERT INTO usuarios_roles (usuario_id,rol_id,asignado_en) SELECT ?,id,UTC_TIMESTAMP(6) FROM roles WHERE codigo='COCINERO'", id);
        assertTrue(enviar(client, base + "me", null, token).body().contains("COCINERO"));
        jdbc.update("DELETE ur FROM usuarios_roles ur JOIN roles r ON ur.rol_id=r.id WHERE ur.usuario_id=? AND r.codigo='USUARIO'", id);
        assertEquals(Set.of("ROLE_COCINERO"), converter.convert(decoder.decode(token)).getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet()));
        jdbc.update("UPDATE usuarios SET eliminado_en=UTC_TIMESTAMP(6) WHERE id=?", id);
        assertEquals(401, enviar(client, base + "me", null, token).statusCode());
        jdbc.update("UPDATE usuarios SET eliminado_en=NULL WHERE id=?", id);
        jdbc.update("UPDATE usuarios SET version_tokens=1 WHERE id=?", id);
        assertEquals(401, enviar(client, base + "me", null, token).statusCode());
        jdbc.update("UPDATE usuarios SET eliminado_en=UTC_TIMESTAMP(6) WHERE id=?", id);
        assertEquals(401, enviar(client, base + "login", login, null).statusCode());
    }

    @Test
    void administracionUsuariosPersisteRolesYFiltra() throws Exception {
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        jdbc.update("INSERT INTO usuarios(correo,nombre_visible,contrasena_hash,version_tokens,version_perfil,creado_en,actualizado_en) VALUES ('admin_prueba@ejemplo.invalid','Admin prueba','x',0,0,NOW(6),NOW(6)),('persona_prueba@ejemplo.invalid','Persona prueba','x',0,0,NOW(6),NOW(6))");
        Long admin = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='admin_prueba@ejemplo.invalid'", Long.class);
        Long persona = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='persona_prueba@ejemplo.invalid'", Long.class);
        jdbc.update("INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT ?,id,NOW(6) FROM roles WHERE codigo='ADMIN'", admin);
        Instant ahora = Instant.now();
        String jwt = token(admin, ahora.minusSeconds(1), ahora.plusSeconds(300), "sabores-oaxaca-api", "sabores-oaxaca-web");
        int puerto = ((WebServerApplicationContext) context).getWebServer().getPort();
        String base = "http://127.0.0.1:" + puerto + "/api/v1/admin/usuarios";
        HttpClient cliente = HttpClient.newHttpClient();
        var listado = adminSolicitud(cliente, base + "?texto=persona_prueba&pagina=0&tamano=1", "GET", jwt);
        assertEquals(200, listado.statusCode(), listado.body());
        assertTrue(listado.body().contains("persona_prueba@ejemplo.invalid"), listado.body());
        assertFalse(listado.body().contains("contrasena"));
        assertEquals(404, adminSolicitud(cliente, base + "/999999999", "GET", jwt).statusCode());
        String rol = base + "/" + persona + "/roles/cocinero";
        assertEquals(204, adminSolicitud(cliente, rol, "PUT", jwt).statusCode());
        assertEquals(204, adminSolicitud(cliente, rol, "PUT", jwt).statusCode());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM usuarios_roles ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=? AND r.codigo='COCINERO'", Integer.class, persona));
        assertTrue(adminSolicitud(cliente, base + "/" + persona, "GET", jwt).body().contains("COCINERO"));
        assertTrue(adminSolicitud(cliente, base + "?rol=COCINERO&texto=persona_prueba", "GET", jwt).body().contains("persona_prueba@ejemplo.invalid"));
        assertEquals(204, adminSolicitud(cliente, rol, "DELETE", jwt).statusCode());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM usuarios_roles WHERE usuario_id=?", Integer.class, persona));
        assertEquals(404, adminSolicitud(cliente, base + "/999999999/roles/cocinero", "PUT", jwt).statusCode());
    }
    private static HttpResponse<String> adminSolicitud(HttpClient cliente, String url, String metodo, String jwt) throws Exception {
        return cliente.send(HttpRequest.newBuilder(URI.create(url)).header("Authorization", "Bearer " + jwt).method(metodo, HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
    }
    private static String token(Long id, Instant iat, Instant exp, String iss, String aud) {
        var claims = JwtClaimsSet.builder().subject(id.toString()).issuer(iss).audience(List.of(aud)).issuedAt(iat).expiresAt(exp).claim("version_tokens", 0).build();
        return context.getBean(JwtEncoder.class).encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    @Test
    void logoutInvalidaTodosLosTokensYPermiteNuevoLogin() throws Exception {
        int port = ((WebServerApplicationContext) context).getWebServer().getPort();
        String base = "http://127.0.0.1:" + port + "/api/v1/auth/";
        HttpClient cliente = HttpClient.newHttpClient();
        String registro = "{\"nombreVisible\":\"Logout\",\"correo\":\"logout@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}";
        String login = "{\"correo\":\"logout@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}";
        assertEquals(201, enviar(cliente, base + "registro", registro, null).statusCode());
        String primero = extraerToken(enviar(cliente, base + "login", login, null).body());
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        Long id = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='logout@ejemplo.invalid'", Long.class);
        Instant ahora = Instant.now();
        String segundo = token(id, ahora.minusSeconds(10), ahora.plusSeconds(90), "sabores-oaxaca-api", "sabores-oaxaca-web");
        assertEquals(200, enviar(cliente, base + "me", null, segundo).statusCode());
        assertEquals(401, enviar(cliente, base + "logout", "", null).statusCode());
        assertEquals(401, enviar(cliente, base + "logout", "", "invalido").statusCode());
        var salida = enviar(cliente, base + "logout", "", primero);
        assertEquals(204, salida.statusCode(), salida.body());
        assertTrue(salida.body().isEmpty());
        assertTrue(salida.headers().allValues("Set-Cookie").isEmpty());
        assertEquals(1L, jdbc.queryForObject("SELECT version_tokens FROM usuarios WHERE id=?", Long.class, id));
        assertEquals(401, enviar(cliente, base + "me", null, primero).statusCode());
        assertEquals(401, enviar(cliente, base + "me", null, segundo).statusCode());
        String nuevo = extraerToken(enviar(cliente, base + "login", login, null).body());
        assertEquals(200, enviar(cliente, base + "me", null, nuevo).statusCode());
        var peticion = HttpRequest.newBuilder(URI.create(base + "logout")).header("Authorization", "Bearer " + nuevo)
                .POST(HttpRequest.BodyPublishers.noBody()).build();
        var a = cliente.sendAsync(peticion, HttpResponse.BodyHandlers.ofString());
        var b = cliente.sendAsync(peticion, HttpResponse.BodyHandlers.ofString());
        assertEquals(1, java.util.stream.Stream.of(a.join().statusCode(), b.join().statusCode()).filter(s -> s == 204).count());
        assertTrue(java.util.stream.Stream.of(a.join().statusCode(), b.join().statusCode()).anyMatch(s -> s == 401 || s == 409));
        assertEquals(2L, jdbc.queryForObject("SELECT version_tokens FROM usuarios WHERE id=?", Long.class, id));
    }

    @Test
    void recuperacionConCorreoSimuladoYMySql() throws Exception {
        int port=((WebServerApplicationContext) context).getWebServer().getPort();
        String base="http://127.0.0.1:"+port+"/api/v1/auth/";
        HttpClient cliente=HttpClient.newHttpClient();
        JdbcTemplate jdbc=context.getBean(JdbcTemplate.class);
        assertEquals(201,enviar(cliente,base+"registro","{\"nombreVisible\":\"Recuperar\",\"correo\":\"recuperar@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}",null).statusCode());
        var deshabilitado=new mx.edu.ito.saboresoaxaca.auth.recuperacion.RecuperacionServicio(em,context.getBean(PlatformTransactionManager.class),context.getBean(PasswordEncoder.class),correoSimulado,"pruebas@ejemplo.invalid",false);
        try {
            assertEquals(503,assertThrows(org.springframework.web.server.ResponseStatusException.class,()->deshabilitado.solicitar("recuperar@ejemplo.invalid")).getStatusCode().value());
            assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM recuperaciones_contrasena WHERE usuario_id=(SELECT id FROM usuarios WHERE correo='recuperar@ejemplo.invalid')",Integer.class));
        } finally { deshabilitado.cerrar(); }
        String jwt=extraerToken(enviar(cliente,base+"login","{\"correo\":\"recuperar@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}",null).body());
        var existente=enviar(cliente,base+"recuperar-contrasena","{\"correo\":\"recuperar@ejemplo.invalid\"}",null);
        var inexistente=enviar(cliente,base+"recuperar-contrasena","{\"correo\":\"noexiste@ejemplo.invalid\"}",null);
        assertEquals(200,existente.statusCode()); assertEquals(existente.body(),inexistente.body());
        var captor=org.mockito.ArgumentCaptor.forClass(jakarta.mail.internet.MimeMessage.class);
        org.mockito.Mockito.verify(correoSimulado,org.mockito.Mockito.timeout(10000).times(1)).send(captor.capture());
        var correo=captor.getValue();
        assertEquals("recuperar@ejemplo.invalid",((jakarta.mail.internet.InternetAddress)correo.getRecipients(jakarta.mail.Message.RecipientType.TO)[0]).getAddress());
        var matcher=java.util.regex.Pattern.compile("https://saboresdeoaxaca\\.food/restablecer-contrasena#token=([A-Za-z0-9_-]{43})").matcher(textoPlano(correo));
        assertTrue(matcher.find()); String token=matcher.group(1);
        assertFalse(existente.body().contains(token));
        Long id=jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='recuperar@ejemplo.invalid'",Long.class);
        assertEquals(1200L,jdbc.queryForObject("SELECT TIMESTAMPDIFF(SECOND,creado_en,expira_en) FROM recuperaciones_contrasena WHERE usuario_id=?",Long.class,id));
        byte[] hash=java.security.MessageDigest.getInstance("SHA-256").digest(token.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        assertArrayEquals(hash,jdbc.queryForObject("SELECT token_hash FROM recuperaciones_contrasena WHERE usuario_id=?",byte[].class,id));
        jdbc.update("UPDATE recuperaciones_contrasena SET creado_en=DATE_SUB(NOW(6),INTERVAL 2 MINUTE) WHERE usuario_id=?",id);
        context.getBean(mx.edu.ito.saboresoaxaca.auth.recuperacion.RecuperacionServicio.class).solicitar("recuperar@ejemplo.invalid");
        var captorSegundo=org.mockito.ArgumentCaptor.forClass(jakarta.mail.internet.MimeMessage.class);
        org.mockito.Mockito.verify(correoSimulado,org.mockito.Mockito.timeout(10000).times(2)).send(captorSegundo.capture());
        var segundoMatcher=java.util.regex.Pattern.compile("#token=([A-Za-z0-9_-]{43})").matcher(textoPlano(captorSegundo.getAllValues().get(1)));
        assertTrue(segundoMatcher.find());
        token=segundoMatcher.group(1);
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM recuperaciones_contrasena WHERE usuario_id=? AND invalidado_en IS NOT NULL",Integer.class,id));
        String prefijo="{\"token\":\""+token+"\",\"contrasena\":\"";
        assertEquals(400,enviar(cliente,base+"restablecer-contrasena",prefijo+"debil\"}",null).statusCode());
        String alterado=(token.charAt(0)=='A' ? "B" : "A")+token.substring(1);
        assertEquals(400,enviar(cliente,base+"restablecer-contrasena","{\"token\":\""+alterado+"\",\"contrasena\":\"NuevaClave1!\"}",null).statusCode());
        String expirado=Base64.getUrlEncoder().withoutPadding().encodeToString(new byte[32]);
        byte[] hashExpirado=java.security.MessageDigest.getInstance("SHA-256").digest(expirado.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        jdbc.update("INSERT INTO recuperaciones_contrasena(usuario_id,token_hash,creado_en,expira_en) VALUES (?,?,DATE_SUB(NOW(6),INTERVAL 30 MINUTE),DATE_SUB(NOW(6),INTERVAL 1 MINUTE))",id,hashExpirado);
        assertEquals(400,enviar(cliente,base+"restablecer-contrasena","{\"token\":\""+expirado+"\",\"contrasena\":\"NuevaClave1!\"}",null).statusCode());
        var solicitud=HttpRequest.newBuilder(URI.create(base+"restablecer-contrasena")).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(prefijo+"NuevaClave1!\"}")).build();
        var a=cliente.sendAsync(solicitud,HttpResponse.BodyHandlers.ofString());
        var b=cliente.sendAsync(solicitud,HttpResponse.BodyHandlers.ofString());
        var codigos=List.of(a.join().statusCode(),b.join().statusCode());
        assertTrue(codigos.contains(200) && codigos.contains(400),codigos.toString());
        assertEquals(401,enviar(cliente,base+"me",null,jwt).statusCode());
        assertEquals(200,enviar(cliente,base+"login","{\"correo\":\"recuperar@ejemplo.invalid\",\"contrasena\":\"NuevaClave1!\"}",null).statusCode());
        assertEquals(1L,jdbc.queryForObject("SELECT version_tokens FROM usuarios WHERE id=?",Long.class,id));
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM recuperaciones_contrasena WHERE usuario_id=? AND usado_en IS NOT NULL",Integer.class,id));
        assertEquals(400,enviar(cliente,base+"restablecer-contrasena",prefijo+"NuevaClave1!\"}",null).statusCode());
        String invalidado=Base64.getUrlEncoder().withoutPadding().encodeToString("12345678901234567890123456789012".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        byte[] hashInvalidado=java.security.MessageDigest.getInstance("SHA-256").digest(invalidado.getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        jdbc.update("INSERT INTO recuperaciones_contrasena(usuario_id,token_hash,creado_en,expira_en,invalidado_en) VALUES (?,?,NOW(6),DATE_ADD(NOW(6),INTERVAL 20 MINUTE),NOW(6))",id,hashInvalidado);
        assertEquals(400,enviar(cliente,base+"restablecer-contrasena","{\"token\":\""+invalidado+"\",\"contrasena\":\"NuevaClave1!\"}",null).statusCode());
        jdbc.update("UPDATE usuarios SET eliminado_en=NOW(6) WHERE id=?",id);
        var desactivada=enviar(cliente,base+"recuperar-contrasena","{\"correo\":\"recuperar@ejemplo.invalid\"}",null);
        assertEquals(existente.body(),desactivada.body());
        assertEquals(429,enviar(cliente,base+"recuperar-contrasena","{\"correo\":\"noexiste@ejemplo.invalid\"}",null).statusCode());
        org.mockito.Mockito.verify(correoSimulado,org.mockito.Mockito.after(1000).times(2)).send(org.mockito.ArgumentMatchers.any(jakarta.mail.internet.MimeMessage.class));
    }

    private static String textoPlano(jakarta.mail.Part parte) throws Exception {
        if (parte instanceof jakarta.mail.internet.MimeMessage mensaje) mensaje.saveChanges();
        if (parte.isMimeType("text/plain")) return (String) parte.getContent();
        if (parte.isMimeType("multipart/*")) {
            var contenido=(jakarta.mail.Multipart) parte.getContent();
            for (int i=0;i<contenido.getCount();i++) {
                String texto=textoPlano(contenido.getBodyPart(i));
                if (texto!=null) return texto;
            }
        }
        return null;
    }

    private static String extraerToken(String respuesta) {
        var matcher = java.util.regex.Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"").matcher(respuesta);
        assertTrue(matcher.find(), respuesta);
        return matcher.group(1);
    }

    @Test
    void concurrenciaPerfilYLogoutNoPierdeCambios() throws Exception {
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        tx.executeWithoutResult(status -> usuarios.save(new Usuario("perfil@ejemplo.invalid", "Original", "hash-de-prueba", LocalDateTime.now())));
        Long id = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='perfil@ejemplo.invalid'", Long.class);
        var leido = new java.util.concurrent.CountDownLatch(1);
        var continuar = new java.util.concurrent.CountDownLatch(1);
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var perfil = pool.submit(() -> tx.executeWithoutResult(status -> {
                Usuario usuario = usuarios.findById(id).orElseThrow();
                leido.countDown();
                esperar(continuar);
                cambiarNombre(usuario, "Perfil actualizado");
            }));
            assertTrue(leido.await(10, java.util.concurrent.TimeUnit.SECONDS));
            tx.executeWithoutResult(status -> assertEquals(1, usuarios.invalidarTokens(id, 0L, 0L)));
            continuar.countDown();
            var conflicto = assertThrows(java.util.concurrent.ExecutionException.class, () -> perfil.get(10, java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(java.util.stream.Stream.iterate((Throwable) conflicto, java.util.Objects::nonNull, Throwable::getCause)
                    .anyMatch(c -> c instanceof org.springframework.dao.OptimisticLockingFailureException || c instanceof jakarta.persistence.OptimisticLockException), "Debe ser un conflicto optimista");
            assertEquals(1L, jdbc.queryForObject("SELECT version_tokens FROM usuarios WHERE id=?", Long.class, id));
            assertEquals("Original", jdbc.queryForObject("SELECT nombre_visible FROM usuarios WHERE id=?", String.class, id));
            assertEquals(1L, jdbc.queryForObject("SELECT version_perfil FROM usuarios WHERE id=?", Long.class, id));

            var ambosLeidos = new java.util.concurrent.CountDownLatch(2);
            var actualizar = new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Callable<Boolean> escribir = () -> {
                try {
                    tx.executeWithoutResult(status -> {
                        Usuario usuario = usuarios.findById(id).orElseThrow();
                        ambosLeidos.countDown();
                        esperar(actualizar);
                        cambiarNombre(usuario, Thread.currentThread().getName());
                        em.flush();
                    });
                    return true;
                } catch (org.springframework.dao.OptimisticLockingFailureException | jakarta.persistence.OptimisticLockException error) {
                    return false;
                }
            };
            var a = pool.submit(escribir);
            var b = pool.submit(escribir);
            assertTrue(ambosLeidos.await(10, java.util.concurrent.TimeUnit.SECONDS));
            actualizar.countDown();
            assertNotEquals(a.get(15, java.util.concurrent.TimeUnit.SECONDS), b.get(15, java.util.concurrent.TimeUnit.SECONDS));
            assertEquals(1L, jdbc.queryForObject("SELECT version_tokens FROM usuarios WHERE id=?", Long.class, id));
        } finally {
            continuar.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void logoutConVersionPerfilObsoletaFallaSinInvalidarJwt() throws Exception {
        int port = ((WebServerApplicationContext) context).getWebServer().getPort();
        String base = "http://127.0.0.1:" + port + "/api/v1/auth/";
        HttpClient cliente = HttpClient.newHttpClient();
        String registro = "{\"nombreVisible\":\"Antes\",\"correo\":\"inverso@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}";
        String login = "{\"correo\":\"inverso@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}";
        assertEquals(201, enviar(cliente, base + "registro", registro, null).statusCode());
        String token = extraerToken(enviar(cliente, base + "login", login, null).body());
        JdbcTemplate jdbc = context.getBean(JdbcTemplate.class);
        Long id = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='inverso@ejemplo.invalid'", Long.class);
        var jwt = context.getBean(JwtDecoder.class).decode(token);
        var leido = new java.util.concurrent.CountDownLatch(1);
        var continuar = new java.util.concurrent.CountDownLatch(1);
        var pool = java.util.concurrent.Executors.newSingleThreadExecutor();
        try {
            var salida = pool.submit(() -> tx.executeWithoutResult(status -> {
                assertEquals(0L, usuarios.findById(id).orElseThrow().getVersionPerfil());
                leido.countDown();
                esperar(continuar);
                context.getBean(mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio.class).logout(jwt);
            }));
            assertTrue(leido.await(10, java.util.concurrent.TimeUnit.SECONDS));
            tx.executeWithoutResult(status -> cambiarNombre(usuarios.findById(id).orElseThrow(), "Despues"));
            continuar.countDown();
            var fallo = assertThrows(java.util.concurrent.ExecutionException.class, () -> salida.get(10, java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(java.util.stream.Stream.iterate((Throwable) fallo, java.util.Objects::nonNull, Throwable::getCause)
                    .anyMatch(c -> c instanceof org.springframework.dao.OptimisticLockingFailureException));
            assertEquals("Despues", jdbc.queryForObject("SELECT nombre_visible FROM usuarios WHERE id=?", String.class, id));
            assertEquals(1L, jdbc.queryForObject("SELECT version_perfil FROM usuarios WHERE id=?", Long.class, id));
            assertEquals(0L, jdbc.queryForObject("SELECT version_tokens FROM usuarios WHERE id=?", Long.class, id));
            assertEquals(200, enviar(cliente, base + "me", null, token).statusCode());
            assertEquals(204, enviar(cliente, base + "logout", "", token).statusCode());
            assertEquals(401, enviar(cliente, base + "me", null, token).statusCode());
            assertEquals(1L, jdbc.queryForObject("SELECT version_tokens FROM usuarios WHERE id=?", Long.class, id));
            assertEquals(2L, jdbc.queryForObject("SELECT version_perfil FROM usuarios WHERE id=?", Long.class, id));
        } finally {
            continuar.countDown();
            pool.shutdownNow();
        }
    }

    private static void esperar(java.util.concurrent.CountDownLatch latch) {
        try { if (!latch.await(10, java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("Tiempo agotado"); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
    }

    private static void cambiarNombre(Usuario usuario, String nombre) {
        try {
            var campo = Usuario.class.getDeclaredField("nombreVisible");
            campo.setAccessible(true);
            campo.set(usuario, nombre);
        } catch (ReflectiveOperationException e) { throw new IllegalStateException(e); }
    }

    private static HttpResponse<String> enviar(HttpClient client, String url, String json, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create(url));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (json == null) builder.GET();
        else builder.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json));
        return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
