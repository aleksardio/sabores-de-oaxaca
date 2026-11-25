package mx.edu.ito.saboresoaxaca;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import jakarta.servlet.DispatcherType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.net.URI;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectProvider<JwtDecoder> decoders,
                                            ObjectProvider<Converter<Jwt, AbstractAuthenticationToken>> converters) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> { })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                .requestMatchers(request -> request.getDispatcherType() == DispatcherType.ERROR && "/error".equals(request.getServletPath())).permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/public/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/recetas", "/api/v1/recetas/{id}", "/api/v1/categorias", "/api/v1/ingredientes").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/mis-recetas", "/api/v1/mis-recetas/{id}").authenticated()
                .requestMatchers("/api/v1/admin/usuarios", "/api/v1/admin/usuarios/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/mis-recetas").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/multimedia/uploads").hasRole("COCINERO")
                .requestMatchers(HttpMethod.PUT, "/api/v1/mis-recetas/{id}").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/mis-recetas/{id}").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/mis-recetas/{id}/enviar-revision").authenticated()
                .requestMatchers("/api/v1/moderacion/recetas", "/api/v1/moderacion/recetas/**").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/registro").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/auth/me").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/auth/logout").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/v1/favoritos").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/v1/favoritos/{recetaId}").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/v1/favoritos/{recetaId}").authenticated()
                .anyRequest().denyAll())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, error) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"No autenticado\"}");
                        })
                        .accessDeniedHandler((request, response, error) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"Acceso denegado\"}");
                        }));
        JwtDecoder decoder = decoders.getIfAvailable();
        if (decoder != null) {
            http.oauth2ResourceServer(oauth -> oauth
                    .authenticationEntryPoint((request, response, error) -> {
                        response.setStatus(401);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"No autenticado\"}");
                    })
                    .jwt(jwt -> jwt.decoder(decoder).jwtAuthenticationConverter(converters.getObject())));
        }
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins:}") String origenes) {
        List<String> lista = Arrays.stream(origenes.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toList();
        for (String origen : lista) {
            URI uri;
            try { uri = URI.create(origen); }
            catch (IllegalArgumentException error) { throw new IllegalStateException("Origen CORS inválido", error); }
            if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
                    || uri.getHost() == null || uri.getUserInfo() != null || uri.getPort() > 65535
                    || (uri.getRawPath() != null && !uri.getRawPath().isEmpty())
                    || uri.getRawQuery() != null || uri.getRawFragment() != null || origen.contains("*")) {
                throw new IllegalStateException("Origen CORS inválido: configure orígenes HTTP(S) exactos");
            }
        }
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(lista);
        config.setAllowedMethods(List.of("GET", "POST"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration favoritos = new CorsConfiguration(config);
        favoritos.setAllowedMethods(List.of("POST", "DELETE"));
        source.registerCorsConfiguration("/api/v1/favoritos/{recetaId}", favoritos);

        CorsConfiguration privadas = new CorsConfiguration(config);
        privadas.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        privadas.setAllowedHeaders(List.of("Content-Type", "Authorization", "If-Match"));
        source.registerCorsConfiguration("/api/v1/mis-recetas/*", privadas);
        source.registerCorsConfiguration("/api/v1/mis-recetas/*/enviar-revision", privadas);
        source.registerCorsConfiguration("/api/v1/moderacion/recetas/**", privadas);
        source.registerCorsConfiguration("/api/v1/admin/usuarios", privadas);
        source.registerCorsConfiguration("/api/v1/admin/usuarios/**", privadas);

        source.registerCorsConfiguration("/api/v1/**", config);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
