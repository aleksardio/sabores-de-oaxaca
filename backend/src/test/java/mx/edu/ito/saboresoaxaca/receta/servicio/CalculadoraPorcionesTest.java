package mx.edu.ito.saboresoaxaca.receta.servicio;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class CalculadoraPorcionesTest {
    @Test
    void escalaConRedondeoYConservaElOriginal() {
        BigDecimal original = new BigDecimal("1.000");
        assertEquals(new BigDecimal("0.667"), CalculadoraPorciones.escalar(original, 3, 2));
        assertEquals(new BigDecimal("1.000"), original);
        assertEquals(new BigDecimal("0.001"), CalculadoraPorciones.escalar(new BigDecimal("0.001"), 2, 1));
    }

    @Test
    void aceptaCantidadNulaYLímitesSinDesbordamiento() {
        assertNull(CalculadoraPorciones.escalar(null, 4, 2));
        assertEquals(new BigDecimal("99999999999.900"),
                CalculadoraPorciones.escalar(new BigDecimal("999999999.999"), 1, 100));
        assertEquals(new BigDecimal("0.000"),
                CalculadoraPorciones.escalar(new BigDecimal("0.001"), 4_294_967_295L, 1));
    }

    @Test
    void rechazaEntradasFueraDeRangoInclusoConCantidadNula() {
        assertThrows(IllegalArgumentException.class, () -> CalculadoraPorciones.escalar(null, 0, 1));
        assertThrows(IllegalArgumentException.class, () -> CalculadoraPorciones.escalar(null, 1, 0));
        assertThrows(IllegalArgumentException.class, () -> CalculadoraPorciones.escalar(null, 1, 101));
        assertThrows(IllegalArgumentException.class, () -> CalculadoraPorciones.escalar(BigDecimal.ZERO, 1, 1));
        assertThrows(IllegalArgumentException.class, () -> CalculadoraPorciones.escalar(new BigDecimal("1000000000"), 1, 1));
    }
}
