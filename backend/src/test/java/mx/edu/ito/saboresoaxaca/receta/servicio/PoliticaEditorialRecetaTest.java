package mx.edu.ito.saboresoaxaca.receta.servicio;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class PoliticaEditorialRecetaTest {
    @Test
    void soloSeEditanBorradoresORechazadasActivas() {
        assertTrue(PoliticaEditorialReceta.permiteEditar("BORRADOR", false));
        assertTrue(PoliticaEditorialReceta.permiteEditar("RECHAZADA", false));
        for (String estado : List.of("PENDIENTE", "PUBLICADA", "ARCHIVADA"))
            assertFalse(PoliticaEditorialReceta.permiteEditar(estado, false));
        assertFalse(PoliticaEditorialReceta.permiteEditar("BORRADOR", true));
        assertFalse(PoliticaEditorialReceta.permiteEditar(null, false));
    }

    @Test
    void soloBorradoresORechazadasActivasPuedenEnviarse() {
        assertTrue(PoliticaEditorialReceta.permiteEnviarRevision("BORRADOR", false));
        assertTrue(PoliticaEditorialReceta.permiteEnviarRevision("RECHAZADA", false));
        for (String estado : List.of("PENDIENTE", "PUBLICADA", "ARCHIVADA"))
            assertFalse(PoliticaEditorialReceta.permiteEnviarRevision(estado, false));
        assertFalse(PoliticaEditorialReceta.permiteEnviarRevision("BORRADOR", true));
        assertFalse(PoliticaEditorialReceta.permiteEnviarRevision("RECHAZADA", true));
        assertFalse(PoliticaEditorialReceta.permiteEnviarRevision(null, false));
    }

    @Test
    void autorPuedeDarDeBajaCualquierEstadoConocidoActivo() {
        for (String estado : List.of("BORRADOR", "PENDIENTE", "PUBLICADA", "RECHAZADA", "ARCHIVADA")) {
            assertTrue(PoliticaEditorialReceta.permiteBajaAutor(estado, false));
            assertFalse(PoliticaEditorialReceta.permiteBajaAutor(estado, true));
        }
        assertFalse(PoliticaEditorialReceta.permiteBajaAutor("DESCONOCIDA", false));
    }
}
