package mx.edu.ito.saboresoaxaca.receta.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import java.math.BigDecimal;
import java.util.List;

public record CrearRecetaSolicitud(String titulo, String descripcion, String preparacion, String tipo,
        Integer porcionesBase, List<Ingrediente> ingredientes, List<Long> categorias, List<Multimedia> multimedia) {
    @JsonAnySetter public void campoNoPermitido(String nombre, Object valor) { throw new IllegalArgumentException("Campo no permitido"); }
    public record Ingrediente(Long ingredienteId, BigDecimal cantidad, String unidad, Integer orden, String nota) {
        @JsonAnySetter public void campoNoPermitido(String nombre, Object valor) { throw new IllegalArgumentException("Campo no permitido"); }
    }
    public record Multimedia(String tipo, String url, String textoAlternativo, Integer orden) {
        @JsonAnySetter public void campoNoPermitido(String nombre, Object valor) { throw new IllegalArgumentException("Campo no permitido"); }
    }
    public record Respuesta(Long id, String estado, Long version) { }
}
