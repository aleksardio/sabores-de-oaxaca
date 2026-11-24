package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.receta.entidad.*;
import mx.edu.ito.saboresoaxaca.receta.repositorio.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import java.security.SecureRandom;
import java.sql.DriverManager;
import java.util.Base64;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(named = "recetas.mysql.it", matches = "true")
class RecetasJpaMySqlTest {
    @Test
    void validaEsquemaYConsultasPublicas() throws Exception {
        String schema = requerido("MYSQL_IT_SCHEMA"), port = System.getenv().getOrDefault("MYSQL_IT_PORT", "3306");
        if (!schema.matches("sabores_oaxaca_it_[a-z0-9_]{1,40}") || !port.matches("[0-9]{1,5}") || Integer.parseInt(port) < 1 || Integer.parseInt(port) > 65535) throw new IllegalArgumentException("Esquema o puerto inválido");
        String user = requerido("MYSQL_IT_USERNAME"), password = requerido("MYSQL_IT_PASSWORD");
        String url = "jdbc:mysql://127.0.0.1:" + port + "/" + schema + "?connectionTimeZone=UTC";
        try (var c = DriverManager.getConnection(url, user, password); var s = c.createStatement()) {
            try (var r = s.executeQuery("SELECT DATABASE(), VERSION(), @@version_comment")) {
                assertTrue(r.next()); assertEquals(schema, r.getString(1));
                assertTrue(r.getString(2).matches("8\\.0\\.(1[6-9]|[2-9][0-9]|[1-9][0-9]{2,})([.-].*)?"));
                assertFalse((r.getString(2) + r.getString(3)).toLowerCase().contains("mariadb"));
            }
            try (var r = s.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")) { assertTrue(r.next()); assertEquals(0, r.getInt(1)); }
        }
        byte[] key = new byte[64]; new SecureRandom().nextBytes(key);
        try (var app = new SpringApplicationBuilder(SaboresDeOaxacaApiApplication.class).run(
                "--spring.profiles.active=dev", "--server.port=0", "--JWT_SECRET_BASE64=" + Base64.getEncoder().encodeToString(key),
                "--spring.datasource.url=" + url, "--spring.datasource.username=" + user, "--spring.datasource.password=" + password,
                "--spring.flyway.enabled=true", "--spring.jpa.hibernate.ddl-auto=validate", "--spring.flyway.clean-disabled=true")) {
            JdbcTemplate jdbc = app.getBean(JdbcTemplate.class);
            int portHttp = ((org.springframework.boot.web.server.context.WebServerApplicationContext) app).getWebServer().getPort();
            String base = "http://127.0.0.1:" + portHttp + "/api/v1";
            var client = java.net.http.HttpClient.newHttpClient();
            var preLogin = preflight(client, base + "/auth/login", "http://localhost:5173", "POST", "content-type");
            assertEquals(200, preLogin.statusCode());
            assertEquals("http://localhost:5173", preLogin.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
            assertTrue(preLogin.headers().firstValue("Access-Control-Allow-Headers").orElseThrow().toLowerCase().contains("content-type"));
            assertTrue(preLogin.headers().firstValue("Access-Control-Allow-Credentials").isEmpty());
            var preMe = preflight(client, base + "/auth/me", "http://localhost:5173", "GET", "authorization");
            assertEquals(200, preMe.statusCode());
            assertTrue(preMe.headers().firstValue("Access-Control-Allow-Headers").orElseThrow().toLowerCase().contains("authorization"));
            assertEquals("http://localhost:5173", preMe.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
            var noPermitido = preflight(client, base + "/auth/me", "https://atacante.invalid", "GET", "authorization");
            assertTrue(noPermitido.headers().firstValue("Access-Control-Allow-Origin").isEmpty());
            assertEquals(403, noPermitido.statusCode());
            var corsPublico = client.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create(base + "/recetas")).header("Origin", "http://localhost:5173").GET().build(), java.net.http.HttpResponse.BodyHandlers.ofString());
            assertEquals(200, corsPublico.statusCode());
            assertEquals("http://localhost:5173", corsPublico.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
            var meAnonimo = client.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create(base + "/auth/me")).header("Origin", "http://localhost:5173").GET().build(), java.net.http.HttpResponse.BodyHandlers.ofString());
            assertEquals(401, meAnonimo.statusCode());
            assertEquals("http://localhost:5173", meAnonimo.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM recetas", Integer.class));
            var catalogoVacio = get(client, base + "/recetas");
            assertEquals(200, catalogoVacio.statusCode());
            assertTrue(catalogoVacio.body().contains("\"contenido\":[]"), catalogoVacio.body());
            assertTrue(catalogoVacio.body().contains("\"totalElementos\":0"), catalogoVacio.body());
            assertTrue(catalogoVacio.body().contains("\"totalPaginas\":0"), catalogoVacio.body());
            jdbc.update("INSERT INTO usuarios(correo,nombre_visible,contrasena_hash,creado_en,actualizado_en) VALUES ('autor@ejemplo.invalid','Autor','hash-ficticio',NOW(6),NOW(6)),('inactivo@ejemplo.invalid','Inactivo','hash-ficticio',NOW(6),NOW(6))");
            jdbc.update("UPDATE usuarios SET eliminado_en=NOW(6) WHERE correo='inactivo@ejemplo.invalid'");
            Long autor = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='autor@ejemplo.invalid'", Long.class);
            Long inactivo = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='inactivo@ejemplo.invalid'", Long.class);
            for (String estado : List.of("PUBLICADA", "PUBLICADA", "BORRADOR", "PENDIENTE", "RECHAZADA", "ARCHIVADA")) {
                jdbc.update("INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en) VALUES (?,?,'desc','prep',? ,?,4,NOW(6),NOW(6))", autor, estado.equals("PUBLICADA") ? "Mole" : estado, estado.equals("BORRADOR") ? "COMUN" : "TRADICIONAL_OAXAQUENA", estado);
            }
            jdbc.update("INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,eliminado_en) VALUES (?,'Eliminada','d','p','COMUN','PUBLICADA',2,NOW(6),NOW(6),NOW(6))", autor);
            jdbc.update("INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en) VALUES (?,'Inactiva','d','p','COMUN','PUBLICADA',2,NOW(6),NOW(6))", inactivo);
            List<Long> ids = jdbc.queryForList("SELECT id FROM recetas WHERE titulo='Mole' ORDER BY id", Long.class);
            jdbc.update("INSERT INTO categorias(nombre) VALUES ('Salsas')");
            Long categoria = jdbc.queryForObject("SELECT id FROM categorias WHERE nombre='Salsas'", Long.class);
            jdbc.update("INSERT INTO recetas_categorias(receta_id,categoria_id) VALUES (?,?)", ids.get(0), categoria);
            jdbc.update("INSERT INTO ingredientes(nombre,creado_en) VALUES ('Sal',NOW(6)),('Chile',NOW(6))");
            Long sal = jdbc.queryForObject("SELECT id FROM ingredientes WHERE nombre='Sal'", Long.class);
            Long chile = jdbc.queryForObject("SELECT id FROM ingredientes WHERE nombre='Chile'", Long.class);
            jdbc.update("INSERT INTO recetas_ingredientes VALUES (?, ?, NULL, 'AL_GUSTO', 2, NULL), (?, ?, 2.000, 'G', 1, NULL)", ids.get(0), sal, ids.get(0), chile);
            jdbc.update("INSERT INTO recetas_multimedia(receta_id,tipo,url,orden,creado_en) VALUES (?,'IMAGEN','https://ejemplo.invalid/2',2,NOW(6)),(?,'IMAGEN','https://ejemplo.invalid/1',1,NOW(6))", ids.get(0), ids.get(0));
            new TransactionTemplate(app.getBean(org.springframework.transaction.PlatformTransactionManager.class)).executeWithoutResult(status -> {
                var recetas = app.getBean(RecetaRepositorio.class);
                assertEquals(2, recetas.buscarPublicadas(null, null, null, PageRequest.of(0, 1)).getTotalElements());
                assertEquals(ids.get(0), recetas.buscarPublicadas(null, null, null, PageRequest.of(0, 1)).getContent().get(0).getId());
                assertEquals(ids.get(1), recetas.buscarPublicadas(null, null, null, PageRequest.of(1, 1)).getContent().get(0).getId());
                assertEquals(1, recetas.buscarPublicadas("mol", categoria, "TRADICIONAL_OAXAQUENA", PageRequest.of(0, 10)).getTotalElements());
                assertEquals(0, recetas.buscarPublicadas(null, null, "COMUN", PageRequest.of(0, 10)).getTotalElements());
                assertTrue(recetas.buscarDetallePublico(ids.get(0)).isPresent());
                for (Long id : jdbc.queryForList("SELECT id FROM recetas WHERE titulo <> 'Mole'", Long.class)) assertTrue(recetas.buscarDetallePublico(id).isEmpty());
                var ingredientes = app.getBean(RecetaIngredienteRepositorio.class).buscarParaRecetas(ids);
                assertEquals(List.of("Chile", "Sal"), ingredientes.stream().map(i -> i.getIngrediente().getNombre()).toList());
                assertEquals(new RecetaIngredienteId(ids.get(0), chile), ingredientes.get(0).getId());
                assertNull(ingredientes.get(1).getCantidad());
                var categorias = app.getBean(RecetaCategoriaRepositorio.class).buscarParaRecetas(ids);
                assertEquals(new RecetaCategoriaId(ids.get(0), categoria), categorias.get(0).getId());
                assertEquals("Salsas", categorias.get(0).getCategoria().getNombre());
                assertEquals(List.of(1, 2), app.getBean(RecetaMultimediaRepositorio.class).buscarParaRecetas(ids).stream().map(RecetaMultimedia::getOrden).toList());
            });
            var catalogo = get(client, base + "/recetas?pagina=0&tamano=1");
            assertEquals(200, catalogo.statusCode());
            assertTrue(catalogo.body().contains("\"totalElementos\":2"));
            assertFalse(catalogo.body().contains("correo"));
            assertFalse(catalogo.body().contains("versionTokens"));
            assertEquals(200, get(client, base + "/categorias").statusCode());
            var detalle = get(client, base + "/recetas/" + ids.get(0) + "?porciones=2");
            assertEquals(200, detalle.statusCode());
            assertTrue(detalle.body().contains("\"cantidadBase\":2.000"), detalle.body());
            assertTrue(detalle.body().contains("\"cantidadAjustada\":1.000"), detalle.body());
            assertTrue(detalle.body().contains("\"unidad\":\"AL_GUSTO\""));
            assertFalse(detalle.body().contains("contrasena"));
            assertEquals(400, get(client, base + "/recetas?pagina=-1").statusCode());
            assertEquals(400, get(client, base + "/recetas/" + ids.get(0) + "?porciones=101").statusCode());
            assertEquals(404, get(client, base + "/recetas/999999").statusCode());
            Long oculto = jdbc.queryForObject("SELECT id FROM recetas WHERE estado='BORRADOR'", Long.class);
            assertEquals(404, get(client, base + "/recetas/" + oculto).statusCode());
            assertEquals(0, cuenta(get(client, base + "/recetas?titulo=%25").body()));
            assertEquals(0, cuenta(get(client, base + "/recetas?titulo=_").body()));
            var post = java.net.http.HttpRequest.newBuilder(java.net.URI.create(base + "/recetas")).POST(java.net.http.HttpRequest.BodyPublishers.noBody()).build();
            assertEquals(401, client.send(post, java.net.http.HttpResponse.BodyHandlers.ofString()).statusCode());
            System.out.println("EJEMPLO_CATALOGO_HTTP=" + catalogo.body());
            System.out.println("EJEMPLO_DETALLE_HTTP=" + detalle.body());

            var paginaDos = get(client, base + "/recetas?pagina=1&tamano=1");
            assertEquals(200, paginaDos.statusCode());
            assertTrue(catalogo.body().contains("\"id\":" + ids.get(0)));
            assertTrue(paginaDos.body().contains("\"id\":" + ids.get(1)));
            assertEquals(2, cuenta(get(client, base + "/recetas?titulo=mol").body()));
            assertEquals(1, cuenta(get(client, base + "/recetas?categoria=" + categoria).body()));
            assertEquals(2, cuenta(get(client, base + "/recetas?tipo=TRADICIONAL_OAXAQUENA").body()));
            assertEquals(1, cuenta(get(client, base + "/recetas?titulo=mol&categoria=" + categoria + "&tipo=TRADICIONAL_OAXAQUENA").body()));
            assertEquals(0, cuenta(get(client, base + "/recetas?titulo=sincoincidencia").body()));
            var vacio = get(client, base + "/recetas?titulo=sincoincidencia");
            assertTrue(vacio.body().contains("\"contenido\":[]"));
            assertTrue(vacio.body().contains("\"totalPaginas\":0"));
            assertEquals(400, get(client, base + "/recetas?tamano=0").statusCode());
            assertEquals(400, get(client, base + "/recetas?tamano=51").statusCode());
            assertEquals(400, get(client, base + "/recetas/" + ids.get(0) + "?porciones=0").statusCode());
            var una = get(client, base + "/recetas/" + ids.get(0) + "?porciones=1");
            assertEquals(200, una.statusCode());
            assertTrue(una.body().contains("\"cantidadBase\":2.000,\"cantidadAjustada\":0.500"), una.body());
            assertTrue(una.body().contains("\"cantidadBase\":null,\"cantidadAjustada\":null,\"unidad\":\"AL_GUSTO\""), una.body());
            var cien = get(client, base + "/recetas/" + ids.get(0) + "?porciones=100");
            assertEquals(200, cien.statusCode());
            assertTrue(cien.body().contains("\"cantidadBase\":2.000,\"cantidadAjustada\":50.000"), cien.body());
            assertTrue(cien.body().contains("\"cantidadBase\":null,\"cantidadAjustada\":null,\"unidad\":\"AL_GUSTO\""), cien.body());
            assertTrue(detalle.body().contains("\"categorias\":[{"));
            assertTrue(detalle.body().contains("\"multimedia\":[{"));
            assertTrue(detalle.body().contains("\"cantidadBase\":null,\"cantidadAjustada\":null"));
            for (String sensible : List.of("correo", "contrasena", "versionTokens", "versionPerfil", "version_tokens", "version_perfil")) assertFalse(detalle.body().contains(sensible));
            for (Long id : jdbc.queryForList("SELECT id FROM recetas WHERE titulo <> 'Mole'", Long.class)) assertEquals(404, get(client, base + "/recetas/" + id).statusCode());

            jdbc.update("INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en) VALUES (?,'Salsa 100%','d','p','COMUN','PUBLICADA',3,NOW(6),NOW(6)),(?,'Salsa_fina','d','p','COMUN','PUBLICADA',3,NOW(6),NOW(6))", autor, autor);
            assertEquals(1, cuenta(get(client, base + "/recetas?titulo=%25").body()));
            assertEquals(1, cuenta(get(client, base + "/recetas?titulo=_").body()));
            Long redondeo = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo='Salsa 100%'", Long.class);
            jdbc.update("INSERT INTO recetas_ingredientes VALUES (?, ?, 1.000, 'G', 1, NULL)", redondeo, chile);
            assertTrue(get(client, base + "/recetas/" + redondeo + "?porciones=2").body().contains("\"cantidadAjustada\":0.667"));
            var cienRedondeo = get(client, base + "/recetas/" + redondeo + "?porciones=100");
            assertEquals(200, cienRedondeo.statusCode());
            assertTrue(cienRedondeo.body().contains("\"cantidadBase\":1.000,\"cantidadAjustada\":33.333"), cienRedondeo.body());
            assertEquals(new java.math.BigDecimal("1.000"), jdbc.queryForObject("SELECT cantidad FROM recetas_ingredientes WHERE receta_id=? AND ingrediente_id=?", java.math.BigDecimal.class, redondeo, chile));
            var borrar = java.net.http.HttpRequest.newBuilder(java.net.URI.create(base + "/recetas/" + ids.get(0))).DELETE().build();
            assertEquals(401, client.send(borrar, java.net.http.HttpResponse.BodyHandlers.ofString()).statusCode());
            var registro = enviar(client, base + "/auth/registro", "POST", "{\"nombreVisible\":\"Prueba\",\"correo\":\"usuario@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}", null);
            assertEquals(201, registro.statusCode(), registro.body());
            var login = enviar(client, base + "/auth/login", "POST", "{\"correo\":\"usuario@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}", null);
            assertEquals(200, login.statusCode(), login.body());
            var tokenMatcher = java.util.regex.Pattern.compile("\"(?:accessToken|token)\":\"([^\"]+)\"").matcher(login.body());
            assertTrue(tokenMatcher.find(), login.body());
            String jwt = tokenMatcher.group(1);
            assertEquals(401, get(client, base + "/mis-recetas").statusCode());
            Long nuevoAutor = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='usuario@ejemplo.invalid'", Long.class);
            jdbc.update("INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en) VALUES (?,'Propia','d','p','COMUN','BORRADOR',4,NOW(6),NOW(6))", nuevoAutor);
            Long propia = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo='Propia'", Long.class);
            var listadoPropio = enviar(client, base + "/mis-recetas", "GET", "", jwt);
            assertEquals(200, listadoPropio.statusCode(), listadoPropio.body());
            assertTrue(listadoPropio.body().contains("\"titulo\":\"Propia\""));
            assertFalse(listadoPropio.body().contains("\"titulo\":\"Mole\""));
            var detallePropio = enviar(client, base + "/mis-recetas/" + propia, "GET", "", jwt);
            assertEquals(200, detallePropio.statusCode(), detallePropio.body());
            assertTrue(detallePropio.body().contains("\"version\":0"), detallePropio.body());
            assertEquals(404, enviar(client, base + "/mis-recetas/" + ids.get(0), "GET", "", jwt).statusCode());
            String cuerpo = "{\"titulo\":\"Nueva\",\"descripcion\":\"Descripción\",\"preparacion\":\"Preparación\",\"tipo\":\"COMUN\",\"porcionesBase\":4,\"categorias\":[" + categoria + "],\"ingredientes\":[{\"ingredienteId\":" + chile + ",\"cantidad\":2.5,\"unidad\":\"G\",\"orden\":1,\"nota\":\"molido\"}],\"multimedia\":[{\"tipo\":\"IMAGEN\",\"url\":\"https://ejemplo.invalid/foto\",\"orden\":1}]}";
            String editar0 = cuerpo.replaceFirst("\\{", "{\"version\":0,");
            assertEquals(401, enviar(client, base + "/mis-recetas/" + propia, "PUT", editar0, null).statusCode());
            assertEquals(403, enviar(client, base + "/mis-recetas/" + propia, "PUT", editar0, jwt).statusCode());
            assertEquals(401, enviar(client, base + "/mis-recetas", "POST", cuerpo, null).statusCode());
            assertEquals(403, enviar(client, base + "/mis-recetas", "POST", cuerpo, jwt).statusCode());
            assertEquals(403, enviar(client, base + "/mis-recetas/" + propia, "PUT", editar0, jwt).statusCode());
            jdbc.update("INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT ?,id,NOW(6) FROM roles WHERE codigo='ADMIN'", nuevoAutor);
            assertEquals(403, enviar(client, base + "/mis-recetas", "POST", cuerpo, jwt).statusCode());
            jdbc.update("INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT ?,id,NOW(6) FROM roles WHERE codigo='COCINERO'", nuevoAutor);
            var creada = enviar(client, base + "/mis-recetas", "POST", cuerpo, jwt);
            assertEquals(201, creada.statusCode(), creada.body());
            assertTrue(creada.body().contains("\"estado\":\"BORRADOR\""), creada.body());
            assertTrue(creada.body().contains("\"version\":0"), creada.body());
            Long creadaId = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo='Nueva' AND autor_id=?", Long.class, nuevoAutor);
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM recetas_ingredientes WHERE receta_id=?", Integer.class, creadaId));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM recetas_categorias WHERE receta_id=?", Integer.class, creadaId));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM recetas_multimedia WHERE receta_id=?", Integer.class, creadaId));
            assertEquals(200, enviar(client, base + "/mis-recetas/" + creadaId, "GET", "", jwt).statusCode());
            int antes = jdbc.queryForObject("SELECT COUNT(*) FROM recetas", Integer.class);
            assertEquals(400, enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("\"categorias\":[" + categoria + "]", "\"categorias\":[999999]"), jwt).statusCode());
            assertEquals(400, enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("\"titulo\":", "\"estado\":\"PUBLICADA\",\"titulo\":"), jwt).statusCode());
            assertEquals(400, enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("\"titulo\":", "\"autor_id\":1,\"titulo\":"), jwt).statusCode());
            assertEquals(antes, jdbc.queryForObject("SELECT COUNT(*) FROM recetas", Integer.class));
            String rutaEditar = base + "/mis-recetas/" + creadaId;
            assertEquals(404, enviar(client, base + "/mis-recetas/" + ids.get(0), "PUT", editar0, jwt).statusCode());
            assertEquals(400, enviar(client, rutaEditar, "PUT", editar0.replace("\"categorias\":[" + categoria + "]", "\"categorias\":[999999]"), jwt).statusCode());
            assertEquals(400, enviar(client, rutaEditar, "PUT", editar0.replace("\"categorias\":[" + categoria + "]", "\"categorias\":[" + categoria + "," + categoria + "]"), jwt).statusCode());
            assertEquals(0L, jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, creadaId));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM recetas_ingredientes WHERE receta_id=?", Integer.class, creadaId));
            jdbc.update("INSERT INTO categorias(nombre) VALUES ('Nueva categoria')");
            Long categoria2 = jdbc.queryForObject("SELECT id FROM categorias WHERE nombre='Nueva categoria'", Long.class);
            String editado = editar0.replace("Nueva", "Editada").replace("Preparación", "Preparación distinta").replace("\"porcionesBase\":4", "\"porcionesBase\":6").replace("\"categorias\":[" + categoria + "]", "\"categorias\":[" + categoria2 + "]").replace("\"ingredienteId\":" + chile, "\"ingredienteId\":" + sal).replace("/foto", "/otra");
            var respuesta = enviar(client, rutaEditar, "PUT", editado, jwt);
            assertEquals(200, respuesta.statusCode(), respuesta.body());
            assertTrue(respuesta.body().contains("\"version\":1"), respuesta.body());
            assertEquals("Editada", jdbc.queryForObject("SELECT titulo FROM recetas WHERE id=?", String.class, creadaId));
            assertEquals("Preparación distinta", jdbc.queryForObject("SELECT preparacion FROM recetas WHERE id=?", String.class, creadaId));
            assertEquals(6, jdbc.queryForObject("SELECT porciones_base FROM recetas WHERE id=?", Integer.class, creadaId));
            assertEquals(sal, jdbc.queryForObject("SELECT ingrediente_id FROM recetas_ingredientes WHERE receta_id=?", Long.class, creadaId));
            assertEquals(categoria2, jdbc.queryForObject("SELECT categoria_id FROM recetas_categorias WHERE receta_id=?", Long.class, creadaId));
            assertTrue(jdbc.queryForObject("SELECT url FROM recetas_multimedia WHERE receta_id=?", String.class, creadaId).endsWith("/otra"));
            assertEquals(409, enviar(client, rutaEditar, "PUT", editar0, jwt).statusCode());
            String editado1 = editado.replace("\"version\":0", "\"version\":1");
            String soloAsociaciones = editado1.replace("/otra", "/tercera");
            assertEquals(200, enviar(client, rutaEditar, "PUT", soloAsociaciones, jwt).statusCode());
            assertEquals(2L, jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, creadaId));
            String version2 = soloAsociaciones.replace("\"version\":1", "\"version\":2");
            jdbc.update("UPDATE recetas SET estado='RECHAZADA' WHERE id=?", creadaId);
            assertEquals(200, enviar(client, rutaEditar, "PUT", version2, jwt).statusCode());
            jdbc.update("UPDATE recetas SET estado='PENDIENTE' WHERE id=?", creadaId);
            String version3 = version2.replace("\"version\":2", "\"version\":3");
            assertEquals(409, enviar(client, rutaEditar, "PUT", version3, jwt).statusCode());
            jdbc.update("UPDATE recetas SET estado='BORRADOR', eliminado_en=NOW(6) WHERE id=?", creadaId);
            assertEquals(409, enviar(client, rutaEditar, "PUT", version3, jwt).statusCode());
            jdbc.update("UPDATE recetas SET eliminado_en=NULL WHERE id=?", creadaId);
            var executor = java.util.concurrent.Executors.newFixedThreadPool(2);
            var inicio = new java.util.concurrent.CountDownLatch(1);
            try {
                var a = executor.submit(() -> { inicio.await(); return enviar(client, rutaEditar, "PUT", version3.replace("Editada", "Concurrente A"), jwt); });
                var b = executor.submit(() -> { inicio.await(); return enviar(client, rutaEditar, "PUT", version3.replace("Editada", "Concurrente B"), jwt); });
                inicio.countDown();
                var codigos = java.util.List.of(a.get().statusCode(), b.get().statusCode());
                assertTrue(codigos.contains(200) && codigos.contains(409), codigos.toString());
            } finally { executor.shutdownNow(); }
            assertEquals(4L, jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, creadaId));
            assertTrue(jdbc.queryForObject("SELECT titulo FROM recetas WHERE id=?", String.class, creadaId).startsWith("Concurrente "));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM recetas_categorias WHERE receta_id=? AND categoria_id=?", Integer.class, creadaId, categoria2));
            String revision = rutaEditar + "/enviar-revision";
            assertEquals(401, accion(client, revision, "POST", 4, null).statusCode());
            assertEquals(401, accion(client, rutaEditar, "DELETE", 4, null).statusCode());
            assertEquals(404, accion(client, base + "/mis-recetas/" + ids.get(0), "DELETE", 0, jwt).statusCode());
            assertEquals(404, accion(client, base + "/mis-recetas/" + ids.get(0) + "/enviar-revision", "POST", 0, jwt).statusCode());
            assertEquals(409, accion(client, revision, "POST", 3, jwt).statusCode());
            assertEquals(409, accion(client, rutaEditar, "DELETE", 3, jwt).statusCode());
            assertEquals(409, accion(client, base + "/mis-recetas/" + propia + "/enviar-revision", "POST", 0, jwt).statusCode());
            jdbc.update("UPDATE recetas SET estado='RECHAZADA' WHERE id=?", creadaId);
            assertEquals(409, accion(client, revision, "POST", 4, jwt).statusCode());
            jdbc.update("UPDATE recetas SET estado='BORRADOR' WHERE id=?", creadaId);
            var carrera = java.util.concurrent.Executors.newFixedThreadPool(2);
            var salida = new java.util.concurrent.CountDownLatch(1);
            try {
                var ed = carrera.submit(() -> { salida.await(); return enviar(client, rutaEditar, "PUT", version3.replace("\"version\":3", "\"version\":4"), jwt); });
                var rev = carrera.submit(() -> { salida.await(); return accion(client, revision, "POST", 4, jwt); });
                salida.countDown();
                var codigos = List.of(ed.get().statusCode(), rev.get().statusCode());
                assertTrue(codigos.contains(200) && codigos.contains(409), codigos.toString());
            } finally { carrera.shutdownNow(); }
            assertEquals(5L, jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, creadaId));
            if ("BORRADOR".equals(jdbc.queryForObject("SELECT estado FROM recetas WHERE id=?", String.class, creadaId))) {
                var enviada = accion(client, revision, "POST", 5, jwt);
                assertEquals(200, enviada.statusCode(), enviada.body());
                assertTrue(enviada.body().contains("\"estado\":\"PENDIENTE\""), enviada.body());
                assertTrue(enviada.body().contains("\"version\":6"), enviada.body());
            }
            long vigente = jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, creadaId);
            assertEquals("PENDIENTE", jdbc.queryForObject("SELECT estado FROM recetas WHERE id=?", String.class, creadaId));
            assertEquals(409, accion(client, revision, "POST", vigente, jwt).statusCode());
            assertEquals(204, accion(client, rutaEditar, "DELETE", vigente, jwt).statusCode());
            assertEquals(vigente + 1, jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, creadaId));
            assertEquals(409, accion(client, rutaEditar, "DELETE", vigente + 1, jwt).statusCode());
            assertEquals(409, accion(client, revision, "POST", vigente + 1, jwt).statusCode());
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM recetas_ingredientes WHERE receta_id=?", Integer.class, creadaId));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM recetas_categorias WHERE receta_id=?", Integer.class, creadaId));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM recetas_multimedia WHERE receta_id=?", Integer.class, creadaId));
            for (String estado : List.of("BORRADOR", "PENDIENTE", "PUBLICADA", "RECHAZADA", "ARCHIVADA")) {
                jdbc.update("INSERT INTO recetas(autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en) VALUES (?,?,'d','p','COMUN',?,4,NOW(6),NOW(6))", nuevoAutor, "Baja " + estado, estado);
                Long bajaId = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo=?", Long.class, "Baja " + estado);
                assertEquals(204, accion(client, base + "/mis-recetas/" + bajaId, "DELETE", 0, jwt).statusCode(), estado);
                assertEquals(1L, jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, bajaId));
                assertEquals(404, get(client, base + "/recetas/" + bajaId).statusCode());
            }
            jdbc.update("DELETE ur FROM usuarios_roles ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=? AND r.codigo='COCINERO'", nuevoAutor);
            assertEquals(200, enviar(client, base + "/mis-recetas/" + creadaId, "GET", "", jwt).statusCode());
            assertEquals(403, enviar(client, base + "/mis-recetas", "POST", cuerpo, jwt).statusCode());
            assertEquals(403, enviar(client, rutaEditar, "PUT", version3, jwt).statusCode());
            assertEquals(403, accion(client, revision, "POST", vigente + 1, jwt).statusCode());
            assertEquals(403, accion(client, rutaEditar, "DELETE", vigente + 1, jwt).statusCode());
            assertEquals(403, enviar(client, base + "/recetas", "POST", "", jwt).statusCode());
            assertEquals(403, enviar(client, base + "/recetas/" + ids.get(0), "DELETE", "", jwt).statusCode());
            assertEquals(403, enviar(client, base + "/categorias", "POST", "", jwt).statusCode());
            assertEquals(403, enviar(client, base + "/admin", "GET", "", jwt).statusCode());
            String detalleAntes = get(client, base + "/recetas/" + ids.get(0)).body();
            String categoriasAntes = get(client, base + "/categorias").body();
            var recetaAntes = jdbc.queryForMap("SELECT * FROM recetas WHERE id=?", ids.get(0));
            var categoriaAntes = jdbc.queryForMap("SELECT * FROM categorias WHERE id=?", categoria);
            for (String metodo : List.of("PUT", "PATCH", "DELETE")) {
                String ruta = base + "/recetas/" + ids.get(0);
                assertEquals(401, enviar(client, ruta, metodo, "{\"titulo\":\"Alterado\"}", null).statusCode(), metodo);
                assertEquals(403, enviar(client, ruta, metodo, "{\"titulo\":\"Alterado\"}", jwt).statusCode(), metodo);
            }
            assertEquals(401, enviar(client, base + "/categorias", "DELETE", "", null).statusCode());
            assertEquals(403, enviar(client, base + "/categorias", "DELETE", "", jwt).statusCode());
            assertEquals(recetaAntes, jdbc.queryForMap("SELECT * FROM recetas WHERE id=?", ids.get(0)));
            assertEquals(categoriaAntes, jdbc.queryForMap("SELECT * FROM categorias WHERE id=?", categoria));
            assertEquals(detalleAntes, get(client, base + "/recetas/" + ids.get(0)).body());
            assertEquals(categoriasAntes, get(client, base + "/categorias").body());
            assertEquals(401, get(client, base + "/moderacion/recetas").statusCode());
            assertEquals(201, enviar(client, base + "/auth/registro", "POST", "{\"nombreVisible\":\"Revisor\",\"correo\":\"revisor@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}", null).statusCode());
            var loginRevisor = enviar(client, base + "/auth/login", "POST", "{\"correo\":\"revisor@ejemplo.invalid\",\"contrasena\":\"Ejemplo1!\"}", null);
            var matcherRevisor = java.util.regex.Pattern.compile("\"(?:accessToken|token)\":\"([^\"]+)\"").matcher(loginRevisor.body());
            assertTrue(matcherRevisor.find());
            String revisor = matcherRevisor.group(1);
            Long revisorId = jdbc.queryForObject("SELECT id FROM usuarios WHERE correo='revisor@ejemplo.invalid'", Long.class);
            assertEquals(403, enviar(client, base + "/moderacion/recetas", "GET", "", revisor).statusCode());
            jdbc.update("INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT ?,id,NOW(6) FROM roles WHERE codigo='COCINERO'", revisorId);
            assertEquals(403, enviar(client, base + "/moderacion/recetas", "GET", "", revisor).statusCode());
            jdbc.update("INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT ?,id,NOW(6) FROM roles WHERE codigo='COCINERO'", nuevoAutor);
            var nuevaModeracion = enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("Nueva", "Por moderar"), jwt);
            assertEquals(201, nuevaModeracion.statusCode(), nuevaModeracion.body());
            Long modId = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo='Por moderar'", Long.class);
            assertEquals(200, accion(client, base + "/mis-recetas/" + modId + "/enviar-revision", "POST", 0, jwt).statusCode());
            assertEquals(403, accion(client, base + "/moderacion/recetas/" + modId + "/aprobar", "POST", 1, jwt).statusCode());
            jdbc.update("INSERT INTO usuarios_roles(usuario_id,rol_id,asignado_en) SELECT ?,id,NOW(6) FROM roles WHERE codigo='MODERADOR'", revisorId);
            assertEquals(200, enviar(client, base + "/moderacion/recetas", "GET", "", revisor).statusCode());
            assertEquals(401, get(client, "http://127.0.0.1:" + portHttp + "/error").statusCode());
            assertEquals(403, enviar(client, "http://127.0.0.1:" + portHttp + "/error", "GET", "", revisor).statusCode());
            assertEquals(403, enviar(client, base + "/ruta-protegida-inexistente", "GET", "", revisor).statusCode());
            assertEquals(404, enviar(client, base + "/moderacion/recetas/99999999", "GET", "", revisor).statusCode());
            assertEquals(200, enviar(client, base + "/moderacion/recetas/" + modId, "GET", "", revisor).statusCode());
            assertEquals(409, accion(client, base + "/moderacion/recetas/" + modId + "/aprobar", "POST", 0, revisor).statusCode());
            var aprobada = accion(client, base + "/moderacion/recetas/" + modId + "/aprobar", "POST", 1, revisor);
            assertEquals(200, aprobada.statusCode(), aprobada.body());
            assertTrue(aprobada.body().contains("\"version\":2"));
            assertEquals(200, get(client, base + "/recetas/" + modId).statusCode());
            assertEquals(409, accion(client, base + "/moderacion/recetas/" + modId + "/aprobar", "POST", 2, revisor).statusCode());
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM auditoria_moderacion WHERE receta_id=? AND actor_id=? AND accion='APROBAR'", Integer.class, modId, revisorId));
            var segunda = enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("Nueva", "Rechazar"), jwt);
            assertEquals(201, segunda.statusCode());
            Long rechazoId = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo='Rechazar'", Long.class);
            assertEquals(200, accion(client, base + "/mis-recetas/" + rechazoId + "/enviar-revision", "POST", 0, jwt).statusCode());
            var reqRechazo = java.net.http.HttpRequest.newBuilder(java.net.URI.create(base + "/moderacion/recetas/" + rechazoId + "/rechazar")).header("If-Match", "\"1\"").header("Authorization", "Bearer " + revisor).header("Content-Type", "application/json").POST(java.net.http.HttpRequest.BodyPublishers.ofString("{\"motivo\":\"Faltan detalles\"}")).build();
            assertEquals(200, client.send(reqRechazo, java.net.http.HttpResponse.BodyHandlers.ofString()).statusCode());
            assertEquals("Faltan detalles", jdbc.queryForObject("SELECT detalle FROM auditoria_moderacion WHERE receta_id=? AND accion='RECHAZAR'", String.class, rechazoId));
            assertEquals(404, get(client, base + "/recetas/" + rechazoId).statusCode());
            assertEquals(409, client.send(reqRechazo, java.net.http.HttpResponse.BodyHandlers.ofString()).statusCode());
            assertEquals(409, accion(client, base + "/moderacion/recetas/" + propia + "/aprobar", "POST", 0, revisor).statusCode());
            var tercero = enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("Nueva", "Concurrencia moderacion"), jwt);
            assertEquals(201, tercero.statusCode());
            Long carreraId = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo='Concurrencia moderacion'", Long.class);
            assertEquals(200, accion(client, base + "/mis-recetas/" + carreraId + "/enviar-revision", "POST", 0, jwt).statusCode());
            String urlAprobar = base + "/moderacion/recetas/" + carreraId + "/aprobar";
            var poolMod = java.util.concurrent.Executors.newFixedThreadPool(2);
            var salidaMod = new java.util.concurrent.CountDownLatch(1);
            try {
                var a = poolMod.submit(() -> { salidaMod.await(); return accion(client, urlAprobar, "POST", 1, revisor); });
                var b = poolMod.submit(() -> { salidaMod.await(); return accion(client, urlAprobar, "POST", 1, revisor); });
                salidaMod.countDown();
                var estados = List.of(a.get().statusCode(), b.get().statusCode());
                assertTrue(estados.contains(200) && estados.contains(409), estados.toString());
            } finally { poolMod.shutdownNow(); }
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM auditoria_moderacion WHERE receta_id=?", Integer.class, carreraId));
            var propiaRevisor = enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("Nueva", "Por admin"), revisor);
            assertEquals(201, propiaRevisor.statusCode());
            Long adminId = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo='Por admin'", Long.class);
            assertEquals(200, accion(client, base + "/mis-recetas/" + adminId + "/enviar-revision", "POST", 0, revisor).statusCode());
            assertEquals(200, accion(client, base + "/moderacion/recetas/" + adminId + "/aprobar", "POST", 1, jwt).statusCode());

            // El trigger existe exclusivamente en el esquema aislado de esta suite y falla después del flush de la receta.
            for (String decision : List.of("aprobar", "rechazar")) {
                String titulo = "Rollback auditoria " + decision;
                assertEquals(201, enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("Nueva", titulo), jwt).statusCode());
                Long rollbackId = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo=?", Long.class, titulo);
                assertEquals(200, accion(client, base + "/mis-recetas/" + rollbackId + "/enviar-revision", "POST", 0, jwt).statusCode());
                jdbc.execute("CREATE TRIGGER it_fallo_auditoria BEFORE INSERT ON auditoria_moderacion FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'fallo controlado de prueba'");
                try {
                    var resultado = decision.equals("aprobar")
                            ? accion(client, base + "/moderacion/recetas/" + rollbackId + "/aprobar", "POST", 1, revisor)
                            : rechazar(client, base + "/moderacion/recetas/" + rollbackId + "/rechazar", 1, revisor);
                    assertEquals(500, resultado.statusCode(), resultado.body());
                    assertEquals("{\"error\":\"Error interno del servidor\"}", resultado.body());
                } finally { jdbc.execute("DROP TRIGGER it_fallo_auditoria"); }
                assertEquals("PENDIENTE", jdbc.queryForObject("SELECT estado FROM recetas WHERE id=?", String.class, rollbackId));
                assertEquals(1L, jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, rollbackId));
                assertNull(jdbc.queryForObject("SELECT publicado_en FROM recetas WHERE id=?", java.sql.Timestamp.class, rollbackId));
                assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM auditoria_moderacion WHERE receta_id=?", Integer.class, rollbackId));
                assertEquals(404, get(client, base + "/recetas/" + rollbackId).statusCode());
            }

            assertEquals(201, enviar(client, base + "/mis-recetas", "POST", cuerpo.replace("Nueva", "Decisiones opuestas"), jwt).statusCode());
            Long opuestasId = jdbc.queryForObject("SELECT id FROM recetas WHERE titulo='Decisiones opuestas'", Long.class);
            assertEquals(200, accion(client, base + "/mis-recetas/" + opuestasId + "/enviar-revision", "POST", 0, jwt).statusCode());
            var poolOpuestas = java.util.concurrent.Executors.newFixedThreadPool(2);
            var iniciarOpuestas = new java.util.concurrent.CountDownLatch(1);
            try (var bloqueo = DriverManager.getConnection(url, user, password)) {
                bloqueo.setAutoCommit(false);
                try (var s = bloqueo.prepareStatement("SELECT id FROM recetas WHERE id=? FOR UPDATE")) {
                    s.setLong(1, opuestasId);
                    try (var rs = s.executeQuery()) { assertTrue(rs.next()); }
                }
                try {
                    var aprobar = poolOpuestas.submit(() -> { iniciarOpuestas.await(); return accion(client, base + "/moderacion/recetas/" + opuestasId + "/aprobar", "POST", 1, revisor); });
                    var rechazar = poolOpuestas.submit(() -> { iniciarOpuestas.await(); return rechazar(client, base + "/moderacion/recetas/" + opuestasId + "/rechazar", 1, revisor); });
                    iniciarOpuestas.countDown();
                    // Las escrituras no pueden confirmar hasta liberar el bloqueo de fila mantenido por esta conexión.
                    Thread.sleep(1000);
                    assertFalse(aprobar.isDone());
                    assertFalse(rechazar.isDone());
                    bloqueo.rollback();
                    var codigos = List.of(aprobar.get(30, java.util.concurrent.TimeUnit.SECONDS).statusCode(), rechazar.get(30, java.util.concurrent.TimeUnit.SECONDS).statusCode());
                    assertTrue(codigos.contains(200) && codigos.contains(409), codigos.toString());
                } finally { bloqueo.rollback(); }
            } finally { poolOpuestas.shutdownNow(); }
            String estadoFinal = jdbc.queryForObject("SELECT estado FROM recetas WHERE id=?", String.class, opuestasId);
            assertTrue(List.of("PUBLICADA", "RECHAZADA").contains(estadoFinal));
            assertEquals(2L, jdbc.queryForObject("SELECT version_receta FROM recetas WHERE id=?", Long.class, opuestasId));
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM auditoria_moderacion WHERE receta_id=?", Integer.class, opuestasId));
            assertEquals(estadoFinal, jdbc.queryForObject("SELECT estado_receta_nuevo FROM auditoria_moderacion WHERE receta_id=?", String.class, opuestasId));
            assertEquals(estadoFinal.equals("PUBLICADA") ? "APROBAR" : "RECHAZAR", jdbc.queryForObject("SELECT accion FROM auditoria_moderacion WHERE receta_id=?", String.class, opuestasId));
            System.out.println("CONCURRENCIA_MODERACION estado=" + estadoFinal + " version=2 auditorias=1");
        }
    }
    private static java.net.http.HttpResponse<String> get(java.net.http.HttpClient client, String url) throws Exception {
        return client.send(java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).GET().build(), java.net.http.HttpResponse.BodyHandlers.ofString());
    }
    private static java.net.http.HttpResponse<String> accion(java.net.http.HttpClient client, String url, String metodo, long version, String jwt) throws Exception {
        var b = java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).header("If-Match", "\"" + version + "\"");
        if (jwt != null) b.header("Authorization", "Bearer " + jwt);
        return client.send(b.method(metodo, java.net.http.HttpRequest.BodyPublishers.noBody()).build(), java.net.http.HttpResponse.BodyHandlers.ofString());
    }
    private static java.net.http.HttpResponse<String> rechazar(java.net.http.HttpClient client, String url, long version, String jwt) throws Exception {
        var request = java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).header("If-Match", "\"" + version + "\"")
                .header("Authorization", "Bearer " + jwt).header("Content-Type", "application/json")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString("{\"motivo\":\"Prueba de rechazo\"}")).build();
        return client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
    }
    private static java.net.http.HttpResponse<String> preflight(java.net.http.HttpClient client, String url, String origen, String metodo, String headers) throws Exception {
        var request = java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).header("Origin", origen)
                .header("Access-Control-Request-Method", metodo).header("Access-Control-Request-Headers", headers)
                .method("OPTIONS", java.net.http.HttpRequest.BodyPublishers.noBody()).build();
        return client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
    }
    private static java.net.http.HttpResponse<String> enviar(java.net.http.HttpClient client, String url, String metodo, String cuerpo, String jwt) throws Exception {
        var b = java.net.http.HttpRequest.newBuilder(java.net.URI.create(url)).header("Content-Type", "application/json");
        if (jwt != null) b.header("Authorization", "Bearer " + jwt);
        return client.send(b.method(metodo, metodo.equals("GET") || metodo.equals("DELETE") ? java.net.http.HttpRequest.BodyPublishers.noBody() : java.net.http.HttpRequest.BodyPublishers.ofString(cuerpo)).build(), java.net.http.HttpResponse.BodyHandlers.ofString());
    }
    private static int cuenta(String json) {
        var m = java.util.regex.Pattern.compile("\"totalElementos\":(\\d+)").matcher(json);
        assertTrue(m.find(), json);
        return Integer.parseInt(m.group(1));
    }
    private static String requerido(String nombre) {
        String valor = System.getenv(nombre);
        if (valor == null || valor.isBlank()) throw new IllegalStateException("Falta " + nombre);
        return valor;
    }
}
