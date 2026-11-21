package mx.edu.ito.saboresoaxaca;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/** Pruebas optativas contra un esquema MySQL local dedicado y inicialmente vacío. */
@EnabledIfSystemProperty(named = "mysql.it", matches = "true")
class MySqlIntegridadTest {
    private static String url;
    private static String usuario;
    private static String password;
    private Connection db;

    @BeforeAll
    static void migrarEsquemaAislado() throws SQLException {
        String esquema = requerido("MYSQL_IT_SCHEMA");
        if (!esquema.matches("sabores_oaxaca_it_[a-z0-9_]{1,40}")) {
            throw new IllegalArgumentException("MYSQL_IT_SCHEMA debe ser un esquema dedicado sabores_oaxaca_it_<nombre>");
        }
        String puerto = System.getenv().getOrDefault("MYSQL_IT_PORT", "3306");
        if (!puerto.matches("[0-9]{1,5}") || Integer.parseInt(puerto) < 1 || Integer.parseInt(puerto) > 65535) {
            throw new IllegalArgumentException("MYSQL_IT_PORT inválido");
        }
        usuario = requerido("MYSQL_IT_USERNAME");
        password = requerido("MYSQL_IT_PASSWORD");
        url = "jdbc:mysql://127.0.0.1:" + puerto + "/" + esquema + "?connectionTimeZone=UTC";
        try (Connection c = DriverManager.getConnection(url, usuario, password);
             Statement s = c.createStatement()) {
            try (ResultSet r = s.executeQuery("SELECT DATABASE(), VERSION(), @@version_comment")) {
                assertTrue(r.next());
                assertEquals(esquema, r.getString(1));
                assertTrue(r.getString(2).matches("8\\.0\\.(1[6-9]|[2-9][0-9]|[1-9][0-9]{2,})([.-].*)?"),
                        "Se requiere MySQL 8.0.16 o superior, versión encontrada: " + r.getString(2));
                assertFalse((r.getString(2) + r.getString(3)).toLowerCase().contains("mariadb"));
            }
            try (ResultSet r = s.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()")) {
                assertTrue(r.next());
                assertEquals(0, r.getInt(1), "El esquema dedicado debe estar vacío; no se borrarán tablas existentes");
            }
        }
        Flyway.configure().dataSource(url, usuario, password).cleanDisabled(true).load().migrate();
    }

    private static String requerido(String nombre) {
        String valor = System.getenv(nombre);
        if (valor == null || valor.isBlank()) throw new IllegalStateException("Falta " + nombre);
        return valor;
    }

    @BeforeEach
    void iniciarTransaccion() throws SQLException {
        db = DriverManager.getConnection(url, usuario, password);
        db.setAutoCommit(false);
    }

    @AfterEach
    void revertirTransaccion() throws SQLException {
        if (db != null) {
            try { db.rollback(); } finally { db.close(); }
        }
    }

    private int ejecutar(String sql, Object... valores) throws SQLException {
        try (PreparedStatement p = db.prepareStatement(sql)) {
            for (int i = 0; i < valores.length; i++) p.setObject(i + 1, valores[i]);
            return p.executeUpdate();
        }
    }

    private long insertar(String sql, Object... valores) throws SQLException {
        try (PreparedStatement p = db.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            for (int i = 0; i < valores.length; i++) p.setObject(i + 1, valores[i]);
            assertEquals(1, p.executeUpdate());
            try (ResultSet r = p.getGeneratedKeys()) { assertTrue(r.next()); return r.getLong(1); }
        }
    }

    private void rechaza(int codigo, String sql, Object... valores) {
        SQLException error = assertThrows(SQLException.class, () -> ejecutar(sql, valores), sql);
        assertEquals(codigo, error.getErrorCode(), "Debe fallar por la restricción esperada: " + error.getMessage());
    }

    private long usuario(String correo) throws SQLException {
        return insertar("INSERT INTO usuarios(correo,nombre_visible,contrasena_hash,creado_en,actualizado_en) VALUES (?, 'Prueba', 'hash-de-prueba', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))", correo);
    }

    private long receta(long autor, String tipo, String estado, int porciones) throws SQLException {
        return insertar("INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en) VALUES (?, 'Receta', 'Descripción', 'Preparación', ?, ?, ?, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))", autor, tipo, estado, porciones);
    }

    private long ingrediente(String nombre) throws SQLException {
        return insertar("INSERT INTO ingredientes(nombre,creado_en) VALUES (?, UTC_TIMESTAMP(6))", nombre);
    }

    @Test
    void tablasMigracionesYRoles() throws SQLException {
        Set<String> tablas = new HashSet<>();
        try (Statement s = db.createStatement(); ResultSet r = s.executeQuery("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'")) {
            while (r.next()) tablas.add(r.getString(1).toLowerCase());
        }
        assertEquals(Set.of("usuarios", "roles", "usuarios_roles", "ingredientes", "categorias", "recetas", "recetas_ingredientes", "recetas_categorias", "recetas_multimedia", "favoritos", "reportes", "auditoria_moderacion", "auditoria_administrativa", "recuperaciones_contrasena", "flyway_schema_history"), tablas);
        try (Statement s = db.createStatement(); ResultSet r = s.executeQuery("SELECT version, success FROM flyway_schema_history WHERE version IS NOT NULL")) {
            Set<String> versiones = new HashSet<>();
            while (r.next()) { assertTrue(r.getBoolean(2)); assertTrue(versiones.add(r.getString(1))); }
            assertEquals(Set.of("1", "2", "3", "4", "5"), versiones);
        }
        try (Statement s = db.createStatement(); ResultSet r = s.executeQuery("SELECT codigo FROM roles")) {
            Set<String> roles = new HashSet<>();
            while (r.next()) roles.add(r.getString(1));
            assertEquals(Set.of("ADMIN", "MODERADOR", "COCINERO", "USUARIO"), roles);
        }
    }

    @Test
    void clavesUnicasYForaneas() throws SQLException {
        long u = usuario("prueba@ejemplo.invalid");
        rechaza(1062, "INSERT INTO usuarios(correo,nombre_visible,contrasena_hash,creado_en,actualizado_en) VALUES (?, 'x', 'x', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))", "PRUEBA@ejemplo.invalid");
        rechaza(1062, "INSERT INTO usuarios(id,correo,nombre_visible,contrasena_hash,creado_en,actualizado_en) VALUES (?, 'otro@ejemplo.invalid', 'x', 'x', UTC_TIMESTAMP(6), UTC_TIMESTAMP(6))", u);
        rechaza(1452, "INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en) VALUES (0,'x','x','x','COMUN','BORRADOR',1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
        long r = receta(u, "COMUN", "BORRADOR", 1);
        rechaza(1452, "INSERT INTO favoritos(usuario_id,receta_id,creado_en) VALUES (?,0,UTC_TIMESTAMP(6))", u);
        rechaza(1451, "DELETE FROM usuarios WHERE id=?", u);
        assertTrue(r > 0);
    }

    @Test
    void relacionesMuchosAMuchosYDuplicados() throws SQLException {
        long u = usuario("cocinero@ejemplo.invalid");
        long r = receta(u, "COMUN", "BORRADOR", 2);
        long i = ingrediente("Maíz");
        long c = insertar("INSERT INTO categorias(nombre) VALUES ('Prueba')");
        String favorito = "INSERT INTO favoritos(usuario_id,receta_id,creado_en) VALUES (?,?,UTC_TIMESTAMP(6))";
        ejecutar(favorito, u, r); rechaza(1062, favorito, u, r);
        String rol = "INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT ?,id,UTC_TIMESTAMP(6) FROM roles WHERE codigo='COCINERO'";
        assertEquals(1, ejecutar(rol, u)); rechaza(1062, rol, u);
        String categoria = "INSERT INTO recetas_categorias(receta_id,categoria_id) VALUES (?,?)";
        ejecutar(categoria, r, c); rechaza(1062, categoria, r, c);
        String ingrediente = "INSERT INTO recetas_ingredientes(receta_id,ingrediente_id,cantidad,unidad,orden) VALUES (?,?,1,'G',1)";
        ejecutar(ingrediente, r, i); rechaza(1062, ingrediente, r, i);
        rechaza(1452, "INSERT INTO recetas_categorias(receta_id,categoria_id) VALUES (?,0)", r);
        rechaza(1452, "INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) VALUES (?,0,UTC_TIMESTAMP(6))", u);
    }

    @Test
    void cantidadesUnidadesYOrden() throws SQLException {
        long u = usuario("ingredientes@ejemplo.invalid");
        long r = receta(u, "TRADICIONAL_OAXAQUENA", "BORRADOR", 4);
        long i = ingrediente("Sal");
        String sql = "INSERT INTO recetas_ingredientes(receta_id,ingrediente_id,cantidad,unidad,orden) VALUES (?,?,?,?,?)";
        rechaza(3819, sql, r, i, null, "G", 1);
        rechaza(3819, sql, r, i, 0, "G", 1);
        rechaza(3819, sql, r, i, -1, "G", 1);
        rechaza(3819, sql, r, i, 1, "AL_GUSTO", 1);
        rechaza(3819, sql, r, i, 1, "INVALIDA", 1);
        rechaza(3819, sql, r, i, 1, "G", 0);
        assertEquals(1, ejecutar(sql, r, i, null, "AL_GUSTO", 1));
        long otro = ingrediente("Chile");
        rechaza(1062, sql, r, otro, 1, "G", 1);
        assertEquals(1, ejecutar(sql, r, otro, new java.math.BigDecimal("0.001"), "G", 2));
    }

    @Test
    void estadosTiposYPorciones() throws SQLException {
        long u = usuario("recetas@ejemplo.invalid");
        String sql = "INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en) VALUES (?, 'x','x','x',?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))";
        rechaza(3819, sql, u, "COMUN", "BORRADOR", 0);
        rechaza(3819, sql, u, "COMUN", "NO_EXISTE", 1);
        rechaza(3819, sql, u, "OTRA", "BORRADOR", 1);
        for (String estado : new String[]{"BORRADOR", "PENDIENTE", "PUBLICADA", "RECHAZADA", "ARCHIVADA"}) {
            assertEquals(1, ejecutar(sql, u, "COMUN", estado, 1));
        }
        assertEquals(1, ejecutar(sql, u, "TRADICIONAL_OAXAQUENA", "BORRADOR", 1));
    }

    @Test
    void checksDeReportesYAuditorias() throws SQLException {
        long u = usuario("moderador@ejemplo.invalid");
        long r = receta(u, "COMUN", "BORRADOR", 1);
        String reporte = "INSERT INTO reportes(receta_id,reportante_id,motivo,estado,creado_en,actualizado_en,resuelto_en) VALUES (?,?,'motivo',?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?)";
        assertEquals(1, ejecutar(reporte, r, u, "ABIERTO", null));
        rechaza(3819, reporte, r, u, "RESUELTO", null);
        String auditoria = "INSERT INTO auditoria_administrativa(actor_id,accion,usuario_afectado_id,receta_afectada_id,detalle,creado_en) VALUES (?,?,?,?,'motivo',UTC_TIMESTAMP(6))";
        assertEquals(1, ejecutar(auditoria, u, "BAJA_RECETA", null, r));
        rechaza(3819, auditoria, u, "BAJA_RECETA", u, r);
        String moderacion = "INSERT INTO auditoria_moderacion(actor_id,receta_id,accion,estado_receta_anterior,estado_receta_nuevo,creado_en) VALUES (?,?,'APROBAR',?,?,UTC_TIMESTAMP(6))";
        assertEquals(1, ejecutar(moderacion, u, r, "PENDIENTE", "PUBLICADA"));
        rechaza(3819, moderacion, u, r, "PENDIENTE", null);
    }
}
