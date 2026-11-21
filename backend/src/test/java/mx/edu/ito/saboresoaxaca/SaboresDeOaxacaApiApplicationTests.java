package mx.edu.ito.saboresoaxaca;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.json.JsonCompareMode;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("bootstrap")
class SaboresDeOaxacaApiApplicationTests {
    @Autowired
    MockMvc mvc;

    @Test
    void healthEsPublico() throws Exception {
        mvc.perform(get("/api/v1/public/health"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"estado":"OK","aplicacion":"Sabores de Oaxaca","modulo":"backend"}
                        """, JsonCompareMode.STRICT));
    }

    @Test
    void otrasRutasYMetodosSeDeniegan() throws Exception {
        mvc.perform(get("/api/v1/privado")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/public/health")).andExpect(status().isForbidden());
    }

}
