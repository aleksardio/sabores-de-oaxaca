package mx.edu.ito.saboresoaxaca.auth.excepcion;

public class CorreoDuplicadoException extends RuntimeException {
    public CorreoDuplicadoException() { super("El correo ya está registrado"); }
}
