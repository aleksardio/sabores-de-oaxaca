package mx.edu.ito.saboresoaxaca.reporte;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class NotificadorSmsReportesTest {
    @Test
    void deshabilitadoNoExigeCredencialesNiContactaProveedor() {
        var notificador = new NotificadorSmsReportes(false, true, "", "", "", "", 300);
        try {
            assertDoesNotThrow(() -> notificador.alCrearReporte(new ReporteCreadoEvento(1L, 2L)));
        } finally {
            notificador.cerrar();
        }
    }

    @Test
    void habilitadoExigeConfiguracionValida() {
        assertThrows(IllegalStateException.class,
                () -> new NotificadorSmsReportes(true, true, "", "", "", "", 300));
        assertThrows(IllegalStateException.class,
                () -> new NotificadorSmsReportes(true, true, "AC" + "1".repeat(32), "token",
                        "+15551234567", "numero-invalido", 300));
    }
}
