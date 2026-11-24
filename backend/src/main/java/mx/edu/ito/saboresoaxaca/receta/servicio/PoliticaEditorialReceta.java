package mx.edu.ito.saboresoaxaca.receta.servicio;

/** Reglas editoriales puras; la propiedad y la autorización se comprueban aparte. */
public final class PoliticaEditorialReceta {
    private PoliticaEditorialReceta() { }

    public static boolean permiteEditar(String estado, boolean eliminada) {
        return !eliminada && ("BORRADOR".equals(estado) || "RECHAZADA".equals(estado));
    }

    public static boolean permiteEnviarRevision(String estado, boolean eliminada) {
        return !eliminada && ("BORRADOR".equals(estado) || "RECHAZADA".equals(estado));
    }

    public static boolean permiteBajaAutor(String estado, boolean eliminada) {
        return !eliminada && ("BORRADOR".equals(estado) || "PENDIENTE".equals(estado)
                || "PUBLICADA".equals(estado) || "RECHAZADA".equals(estado)
                || "ARCHIVADA".equals(estado));
    }
}
