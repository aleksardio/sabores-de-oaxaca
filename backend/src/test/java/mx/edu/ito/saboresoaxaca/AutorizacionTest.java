package mx.edu.ito.saboresoaxaca;

import mx.edu.ito.saboresoaxaca.auth.autorizacion.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;

class AutorizacionTest {
    @Configuration
    @EnableMethodSecurity
    static class Configuracion {
        @Bean ServicioPrueba servicioPrueba() { return new ServicioPrueba(); }
    }

    static class ServicioPrueba {
        @Autenticado public void autenticado() { }
        @SoloCocinero public void cocinar() { }
        @Moderacion public void moderar() { }
        @SoloAdmin public void administrar() { }
    }

    @Test
    void matrizDeRolesSinJerarquia() {
        try (var contexto = new AnnotationConfigApplicationContext(Configuracion.class)) {
            var servicio = contexto.getBean(ServicioPrueba.class);
            probar(servicio, new String[]{"ROLE_USUARIO"}, false, false, false);
            probar(servicio, new String[]{"ROLE_COCINERO"}, true, false, false);
            probar(servicio, new String[]{"ROLE_MODERADOR"}, false, true, false);
            probar(servicio, new String[]{"ROLE_ADMIN"}, false, true, true);
            probar(servicio, new String[]{"ROLE_COCINERO", "ROLE_MODERADOR"}, true, true, false);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private void probar(ServicioPrueba s, String[] roles, boolean cocina, boolean moderacion, boolean admin) {
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken("prueba", null, roles));
        assertDoesNotThrow(s::autenticado);
        verificar(s::cocinar, cocina);
        verificar(s::moderar, moderacion);
        verificar(s::administrar, admin);
    }

    private void verificar(org.junit.jupiter.api.function.Executable accion, boolean permitido) {
        if (permitido) assertDoesNotThrow(accion);
        else assertThrows(AccessDeniedException.class, accion);
    }
}
