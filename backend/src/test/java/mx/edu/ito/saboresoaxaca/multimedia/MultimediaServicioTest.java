package mx.edu.ito.saboresoaxaca.multimedia;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MultimediaServicioTest {
    @TempDir Path carpeta;
    private MultimediaServicio servicio() { return new MultimediaServicio(carpeta.toString(), "https://media.ejemplo.com"); }
    private MockMultipartFile archivo(String nombre, String tipo, byte[] bytes) { return new MockMultipartFile("archivo", nombre, tipo, bytes); }

    @Test void formatosYNombreAleatorio() throws Exception {
        var casos = List.of(
                archivo("foto.jpg", "image/jpeg", new byte[]{-1,-40,-1,0}),
                archivo("foto.png", "image/png", new byte[]{-119,80,78,71,13,10,26,10}),
                archivo("foto.webp", "image/webp", "RIFFxxxxWEBP".getBytes()),
                archivo("video.mp4", "video/mp4", "xxxxftypisom".getBytes()),
                archivo("video.webm", "video/webm", new byte[]{26,69,-33,-93}));
        for (var archivo : casos) {
            var respuesta = servicio().guardar(archivo);
            assertEquals(archivo.getOriginalFilename(), respuesta.nombreOriginal());
            assertEquals(archivo.getSize(), respuesta.tamanoBytes());
            assertTrue(respuesta.url().matches("https://media\\.ejemplo\\.com/uploads/[a-f0-9-]{36}\\.(jpg|png|webp|mp4|webm)"));
            assertTrue(Files.exists(carpeta.resolve(respuesta.url().substring(respuesta.url().lastIndexOf('/') + 1))));
        }
    }
    @Test void rechazaContenidoNombresYLimites() throws Exception {
        for (var f : List.of(archivo("../x.jpg", "image/jpeg", new byte[]{-1,-40,-1}),
                archivo("x\\y.jpg", "image/jpeg", new byte[]{-1,-40,-1}),
                archivo("vacío.jpg", "image/jpeg", new byte[0]),
                archivo("x.svg", "image/svg+xml", "<svg/>".getBytes()),
                archivo("x.html", "text/html", "<html/>".getBytes()),
                archivo("x.jpg", "image/jpeg", "MZ executable".getBytes()),
                archivo("x.mp4", "video/mp4", "<html>falso</html>".getBytes()),
                archivo("x.jpg", "image/jpeg", new byte[5 * 1024 * 1024 + 1]),
                archivo("x.mp4", "video/mp4", new byte[30 * 1024 * 1024 + 1])))
            assertThrows(ResponseStatusException.class, () -> servicio().guardar(f));
        assertEquals(0, Files.list(carpeta).count());
    }
    @Test void rechazaConfiguracionInsegura() {
        var f = archivo("x.jpg", "image/jpeg", new byte[]{-1,-40,-1});
        for (String origen : List.of("http://ejemplo.com", "https://localhost", "https://127.0.0.1", "https://host.local", "https://ejemplo.com/ruta"))
            assertThrows(IllegalStateException.class, () -> new MultimediaServicio(carpeta.toString(), origen).guardar(f));
        assertThrows(IllegalStateException.class, () -> new MultimediaServicio(Path.of("").toAbsolutePath().toString(), "https://ejemplo.com").guardar(f));
    }

    @Test void eliminaArchivoParcialSiFallaLaLectura() throws Exception {
        MultipartFile archivo = mock(MultipartFile.class);
        when(archivo.getOriginalFilename()).thenReturn("foto.jpg");
        when(archivo.getContentType()).thenReturn("image/jpeg");
        when(archivo.getSize()).thenReturn(100L);
        when(archivo.getInputStream()).thenReturn(new InputStream() {
            int posicion;
            @Override public int read() throws IOException {
                if (posicion >= 16) throw new IOException("fallo simulado");
                return posicion++ == 0 ? 255 : posicion == 2 ? 216 : posicion == 3 ? 255 : 0;
            }
        });
        assertThrows(IllegalStateException.class, () -> servicio().guardar(archivo));
        try (var archivos = Files.list(carpeta)) { assertEquals(0, archivos.count()); }
    }

    @Test void noAceptaDirectorioDeSubidaQueSeaEnlaceSimbolico() throws Exception {
        Path real = Files.createDirectory(carpeta.resolve("real"));
        Path enlace = carpeta.resolve("enlace");
        try { Files.createSymbolicLink(enlace, real); }
        catch (UnsupportedOperationException | IOException | SecurityException e) {
            org.junit.jupiter.api.Assumptions.abort("No se pueden crear enlaces simbólicos en este entorno");
        }
        var f = archivo("x.jpg", "image/jpeg", new byte[]{-1, -40, -1});
        assertThrows(IllegalStateException.class, () -> new MultimediaServicio(enlace.toString(), "https://ejemplo.com").guardar(f));
    }
}
