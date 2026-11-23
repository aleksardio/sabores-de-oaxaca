package mx.edu.ito.saboresoaxaca.auth.dto;

import java.util.List;

public record PerfilRespuesta(Long id, String nombreVisible, String correo, List<String> roles) { }
