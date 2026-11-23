package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UsuarioSerializacionTest {
    @Test
    void noSerializaElHash() {
        Usuario usuario = new Usuario("prueba@ejemplo.invalid", "Prueba", "hash-sensible", LocalDateTime.of(2026, 1, 1, 0, 0));
        String json = JsonMapper.builder().build().writeValueAsString(usuario);
        assertTrue(json.contains("prueba@ejemplo.invalid"));
        assertFalse(json.contains("contrasenaHash"));
        assertFalse(json.contains("hash-sensible"));
    }
}
