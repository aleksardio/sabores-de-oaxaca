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

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/** Requiere un esquema local dedicado y vacío; nunca usa bootstrap ni Flyway clean. */
@EnabledIfSystemProperty(named = "jpa.mysql.it", matches = "true")
class IdentidadJpaMySqlTest {
    private static ConfigurableApplicationContext context;
    private static TransactionTemplate tx;
    private static EntityManager em;
    private static UsuarioRepositorio usuarios;
    private static RolRepositorio roles;
    private static UsuarioRolRepositorio asignaciones;

    @BeforeAll
    static void iniciar() throws SQLException {
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
        context = new SpringApplicationBuilder(SaboresDeOaxacaApiApplication.class).run(
                "--spring.profiles.active=dev", "--server.port=0",
                "--spring.datasource.url=" + url, "--spring.datasource.username=" + user,
                "--spring.datasource.password=" + password, "--spring.flyway.enabled=true",
                "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.clean-disabled=true");
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
            Number migraciones = (Number) em.createNativeQuery("SELECT COUNT(*) FROM flyway_schema_history WHERE success=1 AND version IN ('1','2','3','4','5')").getSingleResult();
            Number tablas = (Number) em.createNativeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'").getSingleResult();
            assertEquals(5, migraciones.intValue());
            assertEquals(15, tablas.intValue());
            status.setRollbackOnly();
        });
    }
}
