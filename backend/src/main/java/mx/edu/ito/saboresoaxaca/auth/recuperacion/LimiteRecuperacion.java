package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/** Límite local acotado; no interpreta cabeceras de proxy no confiables. */
public class LimiteRecuperacion {
    private record Ventana(long inicio, int cantidad) { }
    private final Map<String,Ventana> clientes = new HashMap<>();
    private Ventana global = new Ventana(0,0);
    public synchronized void comprobar(String direccion) {
        long ahora=Instant.now().getEpochSecond();
        clientes.entrySet().removeIf(e -> ahora-e.getValue().inicio()>=60);
        if (ahora-global.inicio()>=60) global=new Ventana(ahora,0);
        Ventana actual=clientes.get(direccion);
        if (actual==null) actual=new Ventana(ahora,0);
        if (global.cantidad()>=300 || actual.cantidad()>=10 || (!clientes.containsKey(direccion) && clientes.size()>=10000))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Demasiadas solicitudes");
        global=new Ventana(global.inicio(),global.cantidad()+1);
        clientes.put(direccion,new Ventana(actual.inicio(),actual.cantidad()+1));
    }
}
