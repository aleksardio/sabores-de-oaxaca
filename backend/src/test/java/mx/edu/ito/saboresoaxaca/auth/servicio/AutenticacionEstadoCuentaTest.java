package mx.edu.ito.saboresoaxaca.auth.servicio;

import mx.edu.ito.saboresoaxaca.auth.dto.LoginSolicitud;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRepositorio;
import mx.edu.ito.saboresoaxaca.usuario.repositorio.UsuarioRolRepositorio;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AutenticacionEstadoCuentaTest {
    @Test void cuentaInactivaRechazaPasswordYTokensViejosNoReviven() {
        var usuarios=mock(UsuarioRepositorio.class);
        var encoder=mock(PasswordEncoder.class);
        var servicio=new AutenticacionServicio(usuarios,mock(UsuarioRolRepositorio.class),encoder,mock(JwtEncoder.class),"issuer","audience",1800);
        var u=new Usuario("ana@ejemplo.invalid","Ana","hash",LocalDateTime.now());
        ReflectionTestUtils.setField(u,"id",2L);
        var token=Jwt.withTokenValue("test").header("alg","HS256").subject("2").claim("version_tokens",0L).build();
        when(usuarios.findByCorreo("ana@ejemplo.invalid")).thenReturn(Optional.of(u));
        when(usuarios.findById(2L)).thenReturn(Optional.of(u));
        when(encoder.matches("clave","hash")).thenReturn(true);
        var login=new LoginSolicitud(); login.setCorreo("ana@ejemplo.invalid"); login.setContrasena("clave");
        u.cambiarEstadoCuenta(false,LocalDateTime.now());
        assertThrows(BadCredentialsException.class,()->servicio.login(login));
        assertThrows(BadCredentialsException.class,()->servicio.perfil(token));
        u.cambiarEstadoCuenta(true,LocalDateTime.now());
        assertThrows(BadCredentialsException.class,()->servicio.perfil(token));
    }
}
