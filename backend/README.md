# Sabores de Oaxaca API

Requiere JDK 17. Desde PowerShell en `backend/`:

```powershell
.\mvnw.cmd clean verify
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=bootstrap"
```

Consultar con `Invoke-RestMethod http://localhost:8080/api/v1/public/health`.
El perfil `bootstrap` es temporal y exclusivamente para comprobar el arranque;
no conecta a MySQL y **no debe utilizarse en producción**. La verificación no
representa el estado de una base de datos.

Sin ese perfil se requieren las variables `DB_URL`, `DB_USERNAME` y `DB_PASSWORD`;
véase `application.properties.example`. Hibernate está configurado con `validate`.
Flyway está instalado pero deshabilitado: antes de usarlo se deben diseñar y
revisar las migraciones, habilitarlo y comprobar la conexión y los permisos de MySQL.
No se han creado entidades, migraciones ni tablas. La seguridad deniega todas las
rutas salvo GET health; no hay un mecanismo de autenticación implementado.
