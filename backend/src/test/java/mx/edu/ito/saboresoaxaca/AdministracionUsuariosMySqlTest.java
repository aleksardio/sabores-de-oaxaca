package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.usuario.servicio.AdministracionUsuariosServicio;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

/** Esquema exclusivo vacío: la preparación compartida verifica servidor, esquema y Flyway. */
@EnabledIfSystemProperty(named = "admin.mysql.it", matches = "true")
class AdministracionUsuariosMySqlTest {
    static JdbcTemplate db;
    static AdministracionUsuariosServicio servicio;
    @BeforeAll static void iniciar() throws Exception {
        IdentidadJpaMySqlTest.iniciar();
        db = IdentidadJpaMySqlTest.context.getBean(JdbcTemplate.class);
        servicio = IdentidadJpaMySqlTest.context.getBean(AdministracionUsuariosServicio.class);
        assertEquals(9, db.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE success=1 AND version IN ('1','2','3','4','5','6','7','8','9')", Integer.class));
        assertEquals(9, db.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version IS NOT NULL", Integer.class));
    }
    @AfterAll static void cerrar() { IdentidadJpaMySqlTest.cerrar(); }
    @AfterEach void limpiarContexto() { SecurityContextHolder.clearContext(); }
    static void actor(long id) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(Long.toString(id), "", List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }
    static long usuario(String correo) {
        db.update("INSERT INTO usuarios(correo,nombre_visible,contrasena_hash,creado_en,actualizado_en) VALUES (?, 'Prueba', 'hash', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))", correo);
        return db.queryForObject("SELECT id FROM usuarios WHERE correo=?", Long.class, correo);
    }
    static void admin(long id) { db.update("INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT ?,id,UTC_TIMESTAMP(6) FROM roles WHERE codigo='ADMIN'", id); }
    static long version(long id) { return db.queryForObject("SELECT version_tokens FROM usuarios WHERE id=?", Long.class, id); }
    static int auditorias(long id) { return db.queryForObject("SELECT COUNT(*) FROM auditoria_administrativa WHERE usuario_afectado_id=?", Integer.class, id); }
    static int rol(long id, String codigo) { return db.queryForObject("SELECT COUNT(*) FROM usuarios_roles ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=? AND r.codigo=?", Integer.class, id, codigo); }

    @Test void estadosRolesAuditoriaYRollback() {
        long admin = usuario("admin_integracion@ejemplo.invalid"); admin(admin); actor(admin);
        long id = usuario("persona_integracion@ejemplo.invalid");
        servicio.cambiarEstado(id, false);
        assertNotNull(db.queryForObject("SELECT eliminado_en FROM usuarios WHERE id=?", java.sql.Timestamp.class, id));
        assertEquals(1, version(id));
        servicio.cambiarEstado(id, true);
        assertNull(db.queryForObject("SELECT eliminado_en FROM usuarios WHERE id=?", java.sql.Timestamp.class, id));
        assertEquals(1, version(id));
        assertEquals(2, db.queryForObject("SELECT COUNT(*) FROM auditoria_administrativa WHERE usuario_afectado_id=? AND actor_id=? AND rol_id IS NULL AND accion IN ('DESACTIVAR_CUENTA','REACTIVAR_CUENTA')", Integer.class, id, admin));
        servicio.cambiarCocinero(id, true); servicio.cambiarCocinero(id, true);
        servicio.cambiarModerador(id, true); servicio.cambiarModerador(id, true);
        assertEquals(1, rol(id, "COCINERO")); assertEquals(1, rol(id, "MODERADOR"));
        assertEquals(3, version(id)); assertEquals(4, auditorias(id));
        servicio.cambiarCocinero(id, false); servicio.cambiarCocinero(id, false);
        servicio.cambiarModerador(id, false); servicio.cambiarModerador(id, false);
        assertEquals(0, rol(id, "COCINERO")); assertEquals(0, rol(id, "MODERADOR"));
        assertEquals(5, version(id)); assertEquals(6, auditorias(id));
        for (String codigo : List.of("COCINERO", "MODERADOR")) {
            assertEquals(2, db.queryForObject("SELECT COUNT(*) FROM auditoria_administrativa a JOIN roles r ON r.id=a.rol_id WHERE a.usuario_afectado_id=? AND a.actor_id=? AND r.codigo=? AND a.accion IN ('ASIGNAR_ROL','RETIRAR_ROL')", Integer.class, id, admin, codigo));
        }
        // Indice temporal exclusivo de la base de pruebas: provoca duplicados
        // en auditoria sin requerir permisos globales para crear triggers.
        db.execute("CREATE UNIQUE INDEX it_fallo_auditoria ON auditoria_administrativa (actor_id, accion, usuario_afectado_id, (COALESCE(rol_id, 0)))");
        try {
            assertThrows(RuntimeException.class, () -> servicio.cambiarEstado(id, false));
            assertThrows(RuntimeException.class, () -> servicio.cambiarModerador(id, true));
        } finally { db.execute("DROP INDEX it_fallo_auditoria ON auditoria_administrativa"); }
        assertNull(db.queryForObject("SELECT eliminado_en FROM usuarios WHERE id=?", java.sql.Timestamp.class, id));
        assertEquals(0, rol(id, "MODERADOR")); assertEquals(5, version(id)); assertEquals(6, auditorias(id));
    }
    @Test void concurrenciaProtegeUltimoAdministrador() throws Exception {
        // Aísla este escenario de los demás datos de prueba, sin borrar usuarios ni roles.
        db.update("UPDATE usuarios SET eliminado_en=UTC_TIMESTAMP(6) WHERE id IN (SELECT ur.usuario_id FROM usuarios_roles ur JOIN roles r ON r.id=ur.rol_id WHERE r.codigo='ADMIN')");
        long a=usuario("admin_a_concurrente@ejemplo.invalid"), b=usuario("admin_b_concurrente@ejemplo.invalid");
        admin(a); admin(b);
        var pool = Executors.newFixedThreadPool(2); var inicio = new CountDownLatch(1);
        try {
            Callable<Integer> primera = () -> ejecutarConcurrente(a, b, inicio);
            Callable<Integer> segunda = () -> ejecutarConcurrente(b, a, inicio);
            var f1=pool.submit(primera); var f2=pool.submit(segunda); inicio.countDown();
            assertEquals(List.of(204,409), java.util.stream.Stream.of(f1.get(20,TimeUnit.SECONDS), f2.get(20,TimeUnit.SECONDS)).sorted().toList());
            assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM usuarios u JOIN usuarios_roles ur ON ur.usuario_id=u.id JOIN roles r ON r.id=ur.rol_id WHERE r.codigo='ADMIN' AND u.eliminado_en IS NULL", Integer.class));
            assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM auditoria_administrativa WHERE usuario_afectado_id IN (?,?) AND accion='DESACTIVAR_CUENTA' AND rol_id IS NULL", Integer.class, a,b));
        } finally { pool.shutdownNow(); }
    }
    static int ejecutarConcurrente(long actor, long objetivo, CountDownLatch inicio) throws InterruptedException {
        actor(actor);
        try { inicio.await(); servicio.cambiarEstado(objetivo, false); return 204; }
        catch (ResponseStatusException ex) { return ex.getStatusCode().value(); }
        finally { SecurityContextHolder.clearContext(); }
    }
}
