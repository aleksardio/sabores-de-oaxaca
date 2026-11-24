package mx.edu.ito.saboresoaxaca;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import java.sql.DriverManager;
import java.security.SecureRandom;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "v6.mysql.it", matches = "true")
class MigracionV6MySqlTest {
    @Test
    void actualizaV5SinPerderUsuariosYValidaHibernate() throws Exception {
        String schema = requerido("MYSQL_IT_SCHEMA");
        if (!schema.matches("sabores_oaxaca_it_[a-z0-9_]{1,40}")) throw new IllegalArgumentException("Esquema de prueba inválido");
        String port = System.getenv().getOrDefault("MYSQL_IT_PORT", "3306");
        if (!port.matches("[0-9]{1,5}") || Integer.parseInt(port) < 1 || Integer.parseInt(port) > 65535) throw new IllegalArgumentException("Puerto inválido");
        String user = requerido("MYSQL_IT_USERNAME"), password = requerido("MYSQL_IT_PASSWORD");
        String url = "jdbc:mysql://127.0.0.1:" + port + "/" + schema + "?connectionTimeZone=UTC";
        try (var conexion = DriverManager.getConnection(url, user, password); var sentencia = conexion.createStatement()) {
            try (var r = sentencia.executeQuery("SELECT DATABASE(), VERSION(), @@version_comment")) {
                assertTrue(r.next()); assertEquals(schema, r.getString(1));
                assertTrue(r.getString(2).matches("8\\.0\\.(1[6-9]|[2-9][0-9]|[1-9][0-9]{2,})([.-].*)?"));
                assertFalse((r.getString(2) + r.getString(3)).toLowerCase().contains("mariadb"));
            }
            try (var r = sentencia.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")) {
                assertTrue(r.next()); assertEquals(0, r.getInt(1));
            }
            var v5 = Flyway.configure().dataSource(url, user, password).target("5").cleanDisabled(true).load();
            assertEquals(5, v5.migrate().migrationsExecuted);
            sentencia.executeUpdate("INSERT INTO usuarios(correo,nombre_visible,contrasena_hash,version_tokens,creado_en,actualizado_en) VALUES ('v6@ejemplo.invalid','Ejemplo','hash-ficticio',37,'2026-01-01 00:00:00','2026-01-01 00:00:00')");
            sentencia.executeUpdate("INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT u.id,r.id,'2026-01-01 00:00:00' FROM usuarios u CROSS JOIN roles r WHERE u.correo='v6@ejemplo.invalid' AND r.codigo='USUARIO'");
            var migrador = Flyway.configure().dataSource(url, user, password).target("6").cleanDisabled(true).load();
            assertEquals(1, migrador.migrate().migrationsExecuted);
            assertEquals(0, migrador.migrate().migrationsExecuted);
            try (var r = sentencia.executeQuery("SELECT u.nombre_visible,u.contrasena_hash,u.version_tokens,u.version_perfil,r.codigo FROM usuarios u JOIN usuarios_roles ur ON ur.usuario_id=u.id JOIN roles r ON r.id=ur.rol_id WHERE u.correo='v6@ejemplo.invalid'")) {
                assertTrue(r.next()); assertEquals("Ejemplo", r.getString(1)); assertEquals("hash-ficticio", r.getString(2));
                assertEquals(37, r.getLong(3)); assertEquals(0, r.getLong(4)); assertEquals("USUARIO", r.getString(5)); assertFalse(r.next());
            }
            try (var r = sentencia.executeQuery("SELECT COUNT(*) FROM flyway_schema_history WHERE success=1 AND version IN ('1','2','3','4','5','6')")) { assertTrue(r.next()); assertEquals(6, r.getInt(1)); }
        }
        byte[] clave = new byte[32]; new SecureRandom().nextBytes(clave);
        try (var app = new SpringApplicationBuilder(SaboresDeOaxacaApiApplication.class).run(
                "--spring.profiles.active=dev", "--server.port=0", "--JWT_SECRET_BASE64=" + Base64.getEncoder().encodeToString(clave),
                "--spring.datasource.url=" + url, "--spring.datasource.username=" + user, "--spring.datasource.password=" + password,
                "--spring.flyway.enabled=true", "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.clean-disabled=true")) {
            assertEquals("validate", app.getEnvironment().getProperty("spring.jpa.hibernate.ddl-auto"));
        }
    }
    private static String requerido(String nombre) {
        String valor = System.getenv(nombre);
        if (valor == null || valor.isBlank()) throw new IllegalStateException("Falta " + nombre);
        return valor;
    }
}
