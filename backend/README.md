# Sabores de Oaxaca API

Requiere JDK 17. Desde PowerShell en `backend/`, para compilar y probar:

```powershell
.\mvnw.cmd clean verify
```

## Perfil bootstrap (sin base de datos)

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=bootstrap"
```

Consultar con `Invoke-RestMethod http://localhost:8080/api/v1/public/health`.
El perfil `bootstrap` es temporal y exclusivamente para comprobar el arranque;
no conecta a MySQL y **no debe utilizarse en producción**. La verificación no
representa el estado de una base de datos.

## Perfil dev (MySQL y Flyway)

Usa una base MySQL 8 local preparada y las credenciales facilitadas fuera del repositorio.
Para `sabores_oaxaca` y el usuario local `sabores_app`, en PowerShell:

```powershell
$env:DB_URL = 'jdbc:mysql://localhost:3306/sabores_oaxaca?useUnicode=true&characterEncoding=UTF-8&serverTimezone=UTC'
$env:DB_USERNAME = 'sabores_app'
$clave = Read-Host 'Contraseña MySQL local' -AsSecureString
$env:DB_PASSWORD = [System.Net.NetworkCredential]::new('', $clave).Password
Remove-Variable clave
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$env:JWT_SECRET_BASE64 = [Convert]::ToBase64String($bytes)
Remove-Variable bytes
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Las variables solo se establecen en la sesión actual; al terminar puede retirarse
la contraseña con `Remove-Item Env:DB_PASSWORD`. No incluir contraseñas reales en
archivos ni comandos versionados. Para otras bases modifica `DB_URL` en la sesión.

`dev` habilita Flyway y usa las migraciones existentes V1–V5; Spring Boot ordena
su inicialización antes de JPA. Hibernate usa `ddl-auto=validate`, nunca crea ni
actualiza tablas. Las migraciones necesitan una base seleccionada y permisos
apropiados; con una base no vacía sin historial Flyway, el arranque falla por
seguridad: revisar el estado y respaldar antes de decidir una estrategia, sin
activar baseline ni reparar automáticamente. Si ya existe historial, Flyway
valida las migraciones y aplica únicamente las pendientes. No combinar `dev` y
`bootstrap`; son perfiles para objetivos distintos. Sin `dev`, Flyway está
deshabilitado por defecto, salvo que una configuración externa lo sobrescriba.

Revisar en el registro el resultado de Flyway y, con un cliente MySQL autorizado,
consultar `flyway_schema_history` en la base configurada. La respuesta de health
no verifica la disponibilidad posterior de MySQL.

## Estado del backend

Están implementadas las entidades JPA `Usuario`, `Rol` y `UsuarioRol`, con sus
repositorios. `UsuarioRol` usa clave compuesta y relaciones de carga diferida;
`spring.jpa.open-in-view` está deshabilitado. Hibernate valida los mapeos de las
entidades existentes, **no las 14 tablas completas** ni todas sus restricciones.
Las migraciones Flyway son el mecanismo de creación del esquema.

Los endpoints públicos son `GET /api/v1/public/health`, `POST /api/v1/auth/registro`
y `POST /api/v1/auth/login`. `GET /api/v1/auth/me` requiere Bearer JWT; las demás rutas
están denegadas; `POST /api/v1/auth/logout` requiere Bearer JWT. Autenticación y
registro requieren persistencia, no `bootstrap`.
Quedan pendientes recuperación, recetas y moderación. Contratos:
[registro](docs/REGISTRO_API.md) y [autenticación](docs/AUTENTICACION_API.md).

## Pruebas

`clean verify` ejecuta las pruebas habituales sin MySQL. Las pruebas de integridad
MySQL y de persistencia JPA son optativas, se habilitan por separado y requieren
un esquema local dedicado y vacío; no deben usar bases de desarrollo existentes. Para los
comandos, las variables y las precauciones de aislamiento, consulta
[`src/test/PRUEBAS_MYSQL.md`](src/test/PRUEBAS_MYSQL.md).
