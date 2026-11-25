package mx.edu.ito.saboresoaxaca.auth.recuperacion;

import jakarta.annotation.PreDestroy;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import mx.edu.ito.saboresoaxaca.usuario.entidad.Usuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import jakarta.mail.MessagingException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@Service @Profile("!bootstrap")
public class RecuperacionServicio {
    private static final Logger LOG=LoggerFactory.getLogger(RecuperacionServicio.class);
    private final EntityManager em;
    private final TransactionTemplate tx;
    private final PasswordEncoder encoder;
    private final JavaMailSender mail;
    private final String remitente;
    private final boolean habilitada;
    private final SecureRandom random=new SecureRandom();
    private final ThreadPoolExecutor cola=new ThreadPoolExecutor(1,1,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(100));
    private record Mensaje(String destino,String token) { }

    public RecuperacionServicio(EntityManager em, PlatformTransactionManager transacciones, PasswordEncoder encoder, JavaMailSender mail,
                               @Value("${app.recuperacion.remitente:}") String remitente,
                               @Value("${app.recuperacion.habilitada:false}") boolean habilitada) {
        this.em=em; this.tx=new TransactionTemplate(transacciones); this.encoder=encoder; this.mail=mail; this.remitente=remitente;
        this.habilitada=habilitada && !remitente.isBlank();
    }
    public void solicitar(String correo) {
        disponible();
        try { cola.execute(() -> procesar(correo)); }
        catch (java.util.concurrent.RejectedExecutionException e) { LOG.warn("Cola de recuperación saturada"); }
    }
    private void procesar(String correo) {
        try {
            Mensaje mensaje=tx.execute(status -> crear(correo));
            if (mensaje == null) return;
            mail.send(CorreoRecuperacion.crear(mail,remitente,mensaje.destino(),mensaje.token()));
        } catch (RuntimeException | MessagingException e) { LOG.error("No se pudo procesar el correo de recuperación"); }
    }
    private Mensaje crear(String correo) {
        List<Usuario> encontrados=em.createQuery("select u from Usuario u where u.correo=:correo",Usuario.class).setParameter("correo",correo).setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultList();
        if (encontrados.isEmpty() || encontrados.get(0).getEliminadoEn()!=null) return null;
        Usuario usuario=encontrados.get(0); var ahora=LocalDateTime.now(ZoneOffset.UTC);
        Number recientes=(Number)em.createNativeQuery("SELECT COUNT(*) FROM recuperaciones_contrasena WHERE usuario_id=:id AND creado_en > :limite")
                .setParameter("id",usuario.getId()).setParameter("limite",ahora.minusMinutes(1)).getSingleResult();
        if (recientes.longValue()>0) return null;
        em.createNativeQuery("UPDATE recuperaciones_contrasena SET invalidado_en=:ahora WHERE usuario_id=:id AND usado_en IS NULL AND invalidado_en IS NULL")
                .setParameter("ahora",ahora).setParameter("id",usuario.getId()).executeUpdate();
        byte[] bytes=new byte[32]; random.nextBytes(bytes);
        String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        em.createNativeQuery("INSERT INTO recuperaciones_contrasena(usuario_id,token_hash,creado_en,expira_en) VALUES (:id,:hash,:ahora,:expira)")
                .setParameter("id",usuario.getId()).setParameter("hash",hash(token)).setParameter("ahora",ahora).setParameter("expira",ahora.plusMinutes(20)).executeUpdate();
        return new Mensaje(usuario.getCorreo(),token);
    }
    public boolean restablecer(String token,String contrasena) {
        disponible();
        Boolean resultado=tx.execute(status -> {
            byte[] hash=hash(token);
            List<?> ids=em.createNativeQuery("SELECT usuario_id FROM recuperaciones_contrasena WHERE token_hash=:hash").setParameter("hash",hash).getResultList();
            if (ids.isEmpty()) return false;
            long usuarioId=((Number)ids.get(0)).longValue();
            Usuario usuario=em.find(Usuario.class,usuarioId,LockModeType.PESSIMISTIC_WRITE);
            if (usuario==null || usuario.getEliminadoEn()!=null) return false;
            var ahora=LocalDateTime.now(ZoneOffset.UTC);
            int consumido=em.createNativeQuery("UPDATE recuperaciones_contrasena SET usado_en=:ahora WHERE usuario_id=:id AND token_hash=:hash AND usado_en IS NULL AND invalidado_en IS NULL AND expira_en>:ahora")
                    .setParameter("ahora",ahora).setParameter("id",usuarioId).setParameter("hash",hash).executeUpdate();
            if (consumido!=1) return false;
            usuario.restablecerContrasena(encoder.encode(contrasena),ahora);
            em.createNativeQuery("UPDATE recuperaciones_contrasena SET invalidado_en=:ahora WHERE usuario_id=:id AND usado_en IS NULL AND invalidado_en IS NULL")
                    .setParameter("ahora",ahora).setParameter("id",usuarioId).executeUpdate();
            em.flush();
            return true;
        });
        return Boolean.TRUE.equals(resultado);
    }
    private static byte[] hash(String token) {
        try { return MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.US_ASCII)); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private void disponible() {
        if (!habilitada) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Recuperación temporalmente no disponible");
    }
    @PreDestroy public void cerrar() { cola.shutdown(); }
}
