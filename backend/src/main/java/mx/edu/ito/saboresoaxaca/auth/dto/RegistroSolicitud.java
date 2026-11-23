package mx.edu.ito.saboresoaxaca.auth.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import mx.edu.ito.saboresoaxaca.auth.validacion.LongitudBcrypt;

import java.util.Locale;

public class RegistroSolicitud {
    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 100, message = "El nombre no debe superar 100 caracteres")
    private String nombreVisible;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo no es válido")
    @Size(max = 254, message = "El correo no debe superar 254 caracteres")
    private String correo;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, max = 72, message = "La contraseña debe tener entre 8 y 72 caracteres")
    @Pattern(regexp = "(?s)^(?=.*[A-Z])(?=.*[0-9])(?=.*[^\\p{L}\\p{N}\\s]).*$", message = "La contraseña debe incluir una mayúscula, un número y un carácter especial")
    @LongitudBcrypt
    private String contrasena;

    public String getNombreVisible() { return nombreVisible; }
    public void setNombreVisible(String nombreVisible) { this.nombreVisible = nombreVisible == null ? null : nombreVisible.strip(); }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo == null ? null : correo.strip().toLowerCase(Locale.ROOT); }
    public String getContrasena() { return contrasena; }
    public void setContrasena(String contrasena) { this.contrasena = contrasena; }

    @JsonAnySetter
    public void rechazarCampoDesconocido(String nombre, Object valor) {
        throw new IllegalArgumentException("La solicitud contiene campos no permitidos");
    }
}
