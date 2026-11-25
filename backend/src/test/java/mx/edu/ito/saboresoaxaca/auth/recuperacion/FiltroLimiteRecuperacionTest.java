package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;

class FiltroLimiteRecuperacionTest {
    private static int solicitar(FiltroLimiteRecuperacion filtro,String remoto,String real,String reenviado) throws Exception {
        var solicitud=new MockHttpServletRequest("POST","/api/v1/auth/recuperar-contrasena");
        solicitud.setServletPath("/api/v1/auth/recuperar-contrasena"); solicitud.setRemoteAddr(remoto);
        if (real!=null) solicitud.addHeader("X-Real-IP",real);
        if (reenviado!=null) solicitud.addHeader("X-Forwarded-For",reenviado);
        var respuesta=new MockHttpServletResponse(); filtro.doFilter(solicitud,respuesta,new MockFilterChain());
        return respuesta.getStatus();
    }
    @Test void proxyConfiableSeparaClientesYRechazaCabeceraInvalida() throws Exception {
        var filtro=new FiltroLimiteRecuperacion("127.0.0.1");
        for (int i=0;i<10;i++) assertEquals(200,solicitar(filtro,"127.0.0.1","198.51.100.1","203.0.113.9"));
        assertEquals(429,solicitar(filtro,"127.0.0.1","198.51.100.1","203.0.113.10"));
        assertEquals(200,solicitar(filtro,"127.0.0.1","198.51.100.2",null));
        assertEquals(400,solicitar(filtro,"127.0.0.1",null,null));
        assertEquals(400,solicitar(filtro,"127.0.0.1","198.51.100.3, 198.51.100.4",null));
    }
    @Test void conexionesNoConfiablesNoPuedenFalsificarIp() throws Exception {
        var filtro=new FiltroLimiteRecuperacion("127.0.0.1");
        for (int i=0;i<10;i++) assertEquals(200,solicitar(filtro,"192.0.2.10","198.51.100."+(i+1),"203.0.113."+(i+1)));
        assertEquals(429,solicitar(filtro,"192.0.2.10","198.51.100.22",null));
        assertThrows(IllegalArgumentException.class,()->new FiltroLimiteRecuperacion("proxy.example.com"));
    }
}
