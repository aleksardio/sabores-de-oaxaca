package mx.edu.ito.saboresoaxaca.auth.validacion;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.nio.charset.StandardCharsets;

public class LongitudBcryptValidador implements ConstraintValidator<LongitudBcrypt, String> {
    @Override
    public boolean isValid(String valor, ConstraintValidatorContext context) {
        return valor == null || valor.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
