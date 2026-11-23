package mx.edu.ito.saboresoaxaca.auth.configuracion;

import mx.edu.ito.saboresoaxaca.auth.servicio.AutenticacionServicio;
import org.springframework.context.annotation.Profile;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
@Profile("!bootstrap")
public class AutenticacionJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final AutenticacionServicio servicio;
    public AutenticacionJwtConverter(AutenticacionServicio servicio) { this.servicio = servicio; }
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        var perfil = servicio.perfil(jwt);
        var autoridades = perfil.roles().stream().map(rol -> new SimpleGrantedAuthority("ROLE_" + rol)).toList();
        return new JwtAuthenticationToken(jwt, autoridades, perfil.id().toString());
    }
}
