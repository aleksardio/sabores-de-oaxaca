package mx.edu.ito.saboresoaxaca.reporte;

/** Evento de dominio; solo se notifica cuando se confirma la transacción. */
public record ReporteCreadoEvento(Long reporteId, Long recetaId) { }
