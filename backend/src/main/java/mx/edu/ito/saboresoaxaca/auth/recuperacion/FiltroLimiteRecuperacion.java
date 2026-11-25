package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

@Component
public class FiltroLimiteRecuperacion extends OncePerRequestFilter {
    private final LimiteRecuperacion limite = new LimiteRecuperacion();
    private final InetAddress proxyConfiable;
    public FiltroLimiteRecuperacion(@Value("${app.recuperacion.proxy-confiable:}") String proxy) {
        proxyConfiable = proxy.isBlank() ? null : ipLiteral(proxy);
        if (!proxy.isBlank() && proxyConfiable == null) throw new IllegalArgumentException("IP de proxy confiable inválida");
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String ruta=request.getServletPath();
        if ("POST".equals(request.getMethod()) && ("/api/v1/auth/recuperar-contrasena".equals(ruta) || "/api/v1/auth/restablecer-contrasena".equals(ruta))) {
            String direccion = request.getRemoteAddr();
            if (proxyConfiable != null && proxyConfiable.equals(ipLiteral(direccion))) {
                var encabezados = java.util.Collections.list(request.getHeaders("X-Real-IP"));
                InetAddress cliente = encabezados.size() == 1 ? ipLiteral(encabezados.get(0)) : null;
                if (cliente == null) {
                    response.setStatus(400); response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Dirección de cliente inválida\"}");
                    return;
                }
                direccion = cliente.getHostAddress();
            }
            try { limite.comprobar(direccion); }
            catch (ResponseStatusException exceso) {
                response.setStatus(429); response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Demasiadas solicitudes\"}");
                return;
            }
        }
        chain.doFilter(request,response);
    }
    private static InetAddress ipLiteral(String valor) {
        if (valor == null || valor.isBlank() || valor.contains("%") || !valor.matches("[0-9a-fA-F:.]+") || (!valor.contains(".") && !valor.contains(":"))) return null;
        try { return InetAddress.getByName(valor); }
        catch (UnknownHostException e) { return null; }
    }
}
