package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.*;
import mx.edu.ito.saboresoaxaca.auth.validacion.LongitudBcrypt;
import java.util.Locale;

public final class RecuperacionDto {
    private RecuperacionDto() { }
    public static class Solicitud {
        @NotBlank @Email @Size(max=254) private String correo;
        public String getCorreo() { return correo; }
        public void setCorreo(String correo) { this.correo=correo==null ? null : correo.strip().toLowerCase(Locale.ROOT); }
        @JsonAnySetter public void desconocido(String nombre,Object valor) { throw new IllegalArgumentException("Campo no permitido"); }
    }
    public static class Restablecer {
        @NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") private String token;
        @NotBlank @Size(min=8,max=72) @Pattern(regexp="(?s)^(?=.*[A-Z])(?=.*[0-9])(?=.*[^\\p{L}\\p{N}\\s]).*$") @LongitudBcrypt private String contrasena;
        public String getToken() { return token; }
        public void setToken(String token) { this.token=token; }
        public String getContrasena() { return contrasena; }
        public void setContrasena(String contrasena) { this.contrasena=contrasena; }
        @JsonAnySetter public void desconocido(String nombre,Object valor) { throw new IllegalArgumentException("Campo no permitido"); }
    }
}
