package mx.edu.ito.saboresoaxaca.receta.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.util.List;

public record EditarRecetaSolicitud(Long version, String titulo, String descripcion, String preparacion,
        String tipo, Integer porcionesBase, List<CrearRecetaSolicitud.Ingrediente> ingredientes,
        List<Long> categorias, List<CrearRecetaSolicitud.Multimedia> multimedia) {
    @JsonAnySetter public void campoNoPermitido(String nombre, Object valor) { throw new IllegalArgumentException("Campo no permitido"); }
    public CrearRecetaSolicitud contenido() {
        return new CrearRecetaSolicitud(titulo, descripcion, preparacion, tipo, porcionesBase, ingredientes, categorias, multimedia);
    }
}
