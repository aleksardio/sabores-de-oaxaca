package mx.edu.ito.saboresoaxaca.receta.servicio;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Cálculo decimal sin alterar las cantidades persistidas ni convertir unidades. */
public final class CalculadoraPorciones {
    private CalculadoraPorciones() { }

    public static BigDecimal escalar(BigDecimal cantidadBase, long porcionesBase, int porcionesSolicitadas) {
        if (porcionesBase < 1 || porcionesBase > 4_294_967_295L) {
            throw new IllegalArgumentException("Porciones base inválidas");
        }
        if (porcionesSolicitadas < 1 || porcionesSolicitadas > 100) {
            throw new IllegalArgumentException("Las porciones solicitadas deben estar entre 1 y 100");
        }
        if (cantidadBase == null) return null;
        if (cantidadBase.signum() <= 0 || cantidadBase.scale() > 3
                || cantidadBase.compareTo(new BigDecimal("999999999.999")) > 0) {
            throw new IllegalArgumentException("Cantidad base inválida");
        }
        return cantidadBase.multiply(BigDecimal.valueOf(porcionesSolicitadas))
                .divide(BigDecimal.valueOf(porcionesBase), 3, RoundingMode.HALF_UP);
    }
}
