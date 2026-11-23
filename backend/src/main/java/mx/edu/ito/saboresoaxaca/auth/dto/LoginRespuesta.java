package mx.edu.ito.saboresoaxaca.auth.dto;

public record LoginRespuesta(String token, String tipo, long expiraEnSegundos) { }
