package mx.edu.ito.saboresoaxaca.multimedia;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Arrays;
import java.util.Locale;
import java.util.UUID;

@Service
public class MultimediaServicio {
    private static final long MB = 1024L * 1024;
    private final String directorio;
    private final String origen;
    public record Respuesta(String tipo, String url, String nombreOriginal, long tamanoBytes) { }
    private record Formato(String tipo, String extension, long limite) { }

    public MultimediaServicio(@Value("${app.upload.dir:}") String directorio,
                              @Value("${app.upload.public-origin:}") String origen) {
        this.directorio = directorio; this.origen = origen;
    }

    public Respuesta guardar(MultipartFile archivo) {
        String nombre = archivo.getOriginalFilename();
        if (nombre == null || nombre.isBlank() || nombre.length() > 255 || nombre.equals(".") || nombre.equals("..")
                || nombre.contains("/") || nombre.contains("\\") || nombre.chars().anyMatch(c -> c < 32 || c == 127))
            throw invalido("Nombre de archivo inválido");
        if (archivo.isEmpty()) throw invalido("Archivo vacío");
        Formato formato = formato(archivo.getContentType());
        if (archivo.getSize() > formato.limite()) throw grande();
        Path destino = null;
        boolean creado = false;
        boolean completado = false;
        try {
            Path raiz = raizSegura();
            String base = origenSeguro();
            try (InputStream entrada = archivo.getInputStream()) {
                byte[] cabecera = entrada.readNBytes(16);
                if (!firma(formato.extension(), cabecera)) throw invalido("Contenido de archivo inválido");
                String identificador = UUID.randomUUID().toString();
                destino = raiz.resolve(identificador + ".part");
                long total = cabecera.length;
                try (OutputStream salida = Files.newOutputStream(destino, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                    creado = true;
                    salida.write(cabecera);
                    byte[] buffer = new byte[8192];
                    int n;
                    while ((n = entrada.read(buffer)) != -1) {
                        total += n;
                        if (total > formato.limite()) throw grande();
                        salida.write(buffer, 0, n);
                    }
                    if (total != archivo.getSize()) throw invalido("Tamaño de archivo inválido");
                }
                Path publicado = raiz.resolve(identificador + "." + formato.extension());
                Files.move(destino, publicado);
                completado = true;
                return new Respuesta(formato.tipo(), base + "/uploads/" + publicado.getFileName(), nombre, total);
            }
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo guardar el archivo", e);
        } finally {
            if (creado && !completado) {
                try { Files.deleteIfExists(destino); } catch (IOException ignorado) { /* Requiere limpieza operativa. */ }
            }
        }
    }

    private Path raizSegura() throws IOException {
        if (directorio.isBlank()) throw new IllegalStateException("APP_UPLOAD_DIR no configurado");
        Path ruta = Path.of(directorio);
        if (!ruta.isAbsolute() || !Files.isDirectory(ruta, LinkOption.NOFOLLOW_LINKS)) throw new IllegalStateException("Directorio de subidas inválido");
        Path real = ruta.toRealPath();
        Path trabajo = Path.of("").toAbsolutePath().toRealPath();
        Path repo = trabajo.getFileName() != null && trabajo.getFileName().toString().equals("backend") ? trabajo.getParent() : trabajo;
        if (real.startsWith(repo) || real.toString().replace('\\', '/').matches("(?i).*/dist(?:/.*)?"))
            throw new IllegalStateException("Directorio de subidas debe ser externo");
        return real;
    }

    private String origenSeguro() {
        try {
            URI uri = URI.create(origen);
            String host = uri.getHost();
            if (!"https".equals(uri.getScheme()) || host == null || uri.getUserInfo() != null || uri.getPort() > 65535
                    || (uri.getRawPath() != null && !uri.getRawPath().isEmpty()) || uri.getRawQuery() != null || uri.getRawFragment() != null
                    || !host.matches("(?i)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,63}")
                    || host.toLowerCase(Locale.ROOT).endsWith(".local") || host.toLowerCase(Locale.ROOT).endsWith(".localhost"))
                throw new IllegalArgumentException();
            return uri.toASCIIString();
        } catch (IllegalArgumentException e) { throw new IllegalStateException("APP_UPLOAD_PUBLIC_ORIGIN inválido"); }
    }

    private static Formato formato(String mime) {
        if (mime == null) throw invalido("Tipo de archivo no permitido");
        return switch (mime.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> new Formato("IMAGEN", "jpg", 5 * MB);
            case "image/png" -> new Formato("IMAGEN", "png", 5 * MB);
            case "image/webp" -> new Formato("IMAGEN", "webp", 5 * MB);
            case "video/mp4" -> new Formato("VIDEO", "mp4", 30 * MB);
            case "video/webm" -> new Formato("VIDEO", "webm", 30 * MB);
            default -> throw invalido("Tipo de archivo no permitido");
        };
    }
    private static boolean firma(String tipo, byte[] b) {
        return switch (tipo) {
            case "jpg" -> empieza(b, new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff});
            case "png" -> empieza(b, new byte[]{(byte) 0x89, 80, 78, 71, 13, 10, 26, 10});
            case "webp" -> texto(b, 0, "RIFF") && texto(b, 8, "WEBP");
            case "mp4" -> texto(b, 4, "ftyp");
            case "webm" -> empieza(b, new byte[]{0x1a, 0x45, (byte) 0xdf, (byte) 0xa3});
            default -> false;
        };
    }
    private static boolean empieza(byte[] datos, byte[] prefijo) { return datos.length >= prefijo.length && Arrays.equals(Arrays.copyOf(datos, prefijo.length), prefijo); }
    private static boolean texto(byte[] datos, int offset, String esperado) { byte[] e = esperado.getBytes(StandardCharsets.US_ASCII); return datos.length >= offset + e.length && Arrays.equals(Arrays.copyOfRange(datos, offset, offset + e.length), e); }
    private static ResponseStatusException invalido(String mensaje) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje); }
    private static ResponseStatusException grande() { return new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Archivo demasiado grande"); }
}
