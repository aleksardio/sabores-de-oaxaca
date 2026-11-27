package mx.edu.ito.saboresoaxaca.reporte;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import java.io.ByteArrayOutputStream;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificadorSmsReportesTest {
    @org.springframework.context.annotation.Configuration
    @org.springframework.transaction.annotation.EnableTransactionManagement
    static class Transacciones { }
    private static final String BASE="https://example.api.infobip.com";
    private NotificadorSmsReportes crear(HttpClient cliente) { return new NotificadorSmsReportes(true,BASE,"test-key","444000","+521234567890",300,cliente); }

    @Test void configuracionYDeshabilitado() {
        var n=new NotificadorSmsReportes(false,"","","","",300);
        try { assertDoesNotThrow(() -> n.alCrearReporte(new ReporteCreadoEvento(1L,2L))); } finally { n.cerrar(); }
        assertThrows(IllegalStateException.class,() -> new NotificadorSmsReportes(true,"https://example.invalid","key","444000","+521234567890",300));
        assertThrows(IllegalStateException.class,() -> new NotificadorSmsReportes(true,BASE,"","444000","invalid",300));
    }

    @Test void enviaJsonPersonalizadoYAutorizacion() throws Exception {
        HttpClient cliente=mock(HttpClient.class);
        HttpResponse<Void> respuesta=mock(HttpResponse.class);
        when(respuesta.statusCode()).thenReturn(200);
        var capturada=new CompletableFuture<HttpRequest>();
        when(cliente.send(any(),any())).thenAnswer(inv -> { capturada.complete(inv.getArgument(0)); return respuesta; });
        var n=crear(cliente);
        try {
            n.alCrearReporte(new ReporteCreadoEvento(12L,34L));
            var request=capturada.get(5,TimeUnit.SECONDS);
            assertEquals(BASE+"/sms/3/messages",request.uri().toString());
            assertEquals("POST",request.method());
            assertEquals("App test-key",request.headers().firstValue("Authorization").orElseThrow());
            assertEquals("application/json",request.headers().firstValue("Content-Type").orElseThrow());
            var json=new tools.jackson.databind.json.JsonMapper().readTree(body(request));
            var mensaje=json.path("messages").get(0);
            assertEquals("444000",mensaje.path("sender").asString());
            assertEquals("521234567890",mensaje.path("destinations").get(0).path("to").asString());
            assertEquals("Sabores de Oaxaca: nuevo reporte #12 de receta #34. Revisa el panel de moderacion.",mensaje.path("content").path("text").asString());
            n.alCrearReporte(new ReporteCreadoEvento(13L,35L));
            verify(cliente,times(1)).send(any(),any());
        } finally { n.cerrar(); }
    }

    @Test void erroresYRedNoSePropaganNiSeReintentan() throws Exception {
        for (int status : new int[]{401,403,429,500,0}) {
            HttpClient cliente=mock(HttpClient.class);
            HttpResponse<Void> respuesta=mock(HttpResponse.class);
            when(respuesta.statusCode()).thenReturn(status);
            CountDownLatch enviado=new CountDownLatch(1);
            when(cliente.send(any(),any())).thenAnswer(inv -> { enviado.countDown(); if (status==0) throw new java.io.IOException("sin red"); return respuesta; });
            var n=crear(cliente);
            try { assertDoesNotThrow(() -> n.alCrearReporte(new ReporteCreadoEvento(1L,2L))); assertTrue(enviado.await(5,TimeUnit.SECONDS)); verify(cliente,times(1)).send(any(),any()); }
            finally { n.cerrar(); }
        }
    }

    @Test void listenerSoloEnviaDespuesDeCommitNoEnRollback() throws Exception {
        HttpClient cliente=mock(HttpClient.class);
        HttpResponse<Void> respuesta=mock(HttpResponse.class);
        when(respuesta.statusCode()).thenReturn(200);
        CountDownLatch enviado=new CountDownLatch(1);
        when(cliente.send(any(),any())).thenAnswer(inv -> { enviado.countDown(); return respuesta; });
        var n=crear(cliente);
        try (var ctx=new AnnotationConfigApplicationContext()) {
            ctx.register(Transacciones.class);
            ctx.registerBean(NotificadorSmsReportes.class,() -> n);
            ctx.refresh();
            var tx=new TransactionTemplate(new AbstractPlatformTransactionManager() {
                protected Object doGetTransaction() { return new Object(); }
                protected void doBegin(Object transaction, org.springframework.transaction.TransactionDefinition definition) { }
                protected void doCommit(DefaultTransactionStatus status) { }
                protected void doRollback(DefaultTransactionStatus status) { }
            });
            tx.executeWithoutResult(status -> { ctx.publishEvent(new ReporteCreadoEvento(1L,2L)); status.setRollbackOnly(); });
            verify(cliente,never()).send(any(),any());
            tx.executeWithoutResult(status -> { ctx.publishEvent(new ReporteCreadoEvento(3L,4L)); try { verify(cliente,never()).send(any(),any()); } catch (Exception e) { throw new RuntimeException(e); } });
            assertTrue(enviado.await(5,TimeUnit.SECONDS));
            verify(cliente,times(1)).send(any(),any());
        } finally { n.cerrar(); }
    }

    private static String body(HttpRequest request) throws Exception {
        var result=new CompletableFuture<String>();
        var out=new ByteArrayOutputStream();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<ByteBuffer>() {
            public void onSubscribe(Flow.Subscription s) { s.request(Long.MAX_VALUE); }
            public void onNext(ByteBuffer b) { byte[] bytes=new byte[b.remaining()]; b.get(bytes); out.writeBytes(bytes); }
            public void onError(Throwable e) { result.completeExceptionally(e); }
            public void onComplete() { result.complete(out.toString(StandardCharsets.UTF_8)); }
        });
        return result.get(5,TimeUnit.SECONDS);
    }
}
