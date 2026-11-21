package mx.edu.ito.saboresoaxaca;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class SaboresDeOaxacaApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(SaboresDeOaxacaApiApplication.class, args);
	}

}
