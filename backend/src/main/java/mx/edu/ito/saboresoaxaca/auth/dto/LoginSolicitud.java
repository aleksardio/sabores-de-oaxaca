package mx.edu.ito.saboresoaxaca.auth.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import mx.edu.ito.saboresoaxaca.auth.validacion.LongitudBcrypt;
import java.util.Locale;

public class LoginSolicitud {
    @NotBlank(message = "El correo es obligatorio")
    @Size(max = 254)
    private String correo;
    @NotBlank(message = "La contraseña es obligatoria")
    @Size(max = 72)
    @LongitudBcrypt
    private String contrasena;
    public String getCorreo() { return correo; }
    public void setCorreo(String valor) { correo = valor == null ? null : valor.strip().toLowerCase(Locale.ROOT); }
    public String getContrasena() { return contrasena; }
    public void setContrasena(String valor) { contrasena = valor; }
    @JsonAnySetter
    public void rechazar(String nombre, Object valor) { throw new IllegalArgumentException("Campo no permitido"); }
}
