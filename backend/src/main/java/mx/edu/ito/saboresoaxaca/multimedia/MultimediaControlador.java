package mx.edu.ito.saboresoaxaca.multimedia;

import mx.edu.ito.saboresoaxaca.auth.autorizacion.SoloCocinero;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/multimedia/uploads")
public class MultimediaControlador {
    private final MultimediaServicio servicio;
    public MultimediaControlador(MultimediaServicio servicio) { this.servicio = servicio; }

    @SoloCocinero
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MultimediaServicio.Respuesta subir(@RequestPart("archivo") MultipartFile archivo) {
        return servicio.guardar(archivo);
    }
}
