# Pruebas de integridad MySQL

Las pruebas son optativas y no usan el perfil `bootstrap`; la suite de integridad usa JDBC y la de identidad inicia Spring con `dev`. Necesitan MySQL Community 8.0.16–8.0.x, JDK 17 y un **esquema dedicado vacío**. No apuntar a `sabores_oaxaca`, `sabores_oaxaca_test`, `araj_act3_dev`, `araj_act4_dev` ni a bases con datos. La suite solo acepta nombres `sabores_oaxaca_it_` seguidos de 1–40 letras minúsculas ASCII, dígitos o guiones bajos, se conecta a `127.0.0.1` y rechaza esquemas que ya tengan tablas o vistas. Nunca ejecuta Flyway clean, DROP de tablas o bases, TRUNCATE ni limpieza de bases existentes. Algunas pruebas crean y retiran un trigger temporal en el esquema dedicado.

En un servidor local de pruebas, crear manualmente un esquema nuevo con un nombre único, por ejemplo `sabores_oaxaca_it_20261120`. Crear o utilizar un usuario exclusivo con permisos solo sobre ese esquema para conectarse, crear tablas e índices, aplicar las migraciones y operar sobre sus tablas. No concederle privilegios sobre otras bases. No usar credenciales reales de producción. MySQL debe tener activo el motor InnoDB y una cuenta que pueda consultar los metadatos de su propio esquema.

Por ejemplo, con el cliente de MySQL instalado y un administrador local autorizado, el siguiente comando solicita su contraseña de forma interactiva y **falla si el esquema ya existe**; sustituye el nombre por uno nuevo:

```powershell
mysql.exe --host=127.0.0.1 --port=3306 --user=ADMIN_LOCAL --password --execute="CREATE DATABASE sabores_oaxaca_it_20261120 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
```

Configura por separado la cuenta exclusiva y sus permisos limitados a ese esquema; no incluyas su contraseña en comandos guardados ni archivos del repositorio. El usuario debe disponer de permisos DDL y DML para que Flyway pueda crear sus tablas y ejecutar las pruebas.

Desde PowerShell, con `JAVA_HOME` apuntando al JDK 17:

```powershell
cd D:\Spring\sabores-de-oaxaca\backend
$env:MYSQL_IT_SCHEMA = 'sabores_oaxaca_it_20261120'
$env:MYSQL_IT_PORT = '3306'
$env:MYSQL_IT_USERNAME = Read-Host 'Usuario MySQL exclusivo de pruebas'
$clave = Read-Host 'Contraseña MySQL de pruebas' -AsSecureString
$env:MYSQL_IT_PASSWORD = [System.Net.NetworkCredential]::new('', $clave).Password
Remove-Variable clave
.\mvnw.cmd '-Dmysql.it=true' '-Dtest=MySqlIntegridadTest' test
```

Las pruebas comprueban el esquema vacío, ejecutan V1–V9 mediante Flyway y dejan esas tablas y su historial en el esquema dedicado. Para repetir, crear **otro esquema vacío** con nombre distinto y actualizar `MYSQL_IT_SCHEMA`: la suite no reutiliza ni elimina el anterior. Si Flyway falla parcialmente, inspeccionar ese esquema sin ejecutar limpiezas automáticas; MySQL puede confirmar DDL implícitamente.

El comando normal `mvnw.cmd test` no habilita la suite MySQL y no necesita credenciales; requiere el parámetro explícito `-Dmysql.it=true`. La contraseña solo vive en el entorno del proceso actual: al terminar, retirarla con `Remove-Item Env:MYSQL_IT_PASSWORD`. Usar una cuenta con privilegios limitados es indispensable: el nombre del esquema es una defensa adicional, no sustituye el aislamiento por permisos ni protege frente a configuración externa de MySQL como triggers o vistas ajenas.

## Integración JPA de identidad

Con otro esquema dedicado vacío y las mismas variables `MYSQL_IT_*`, ejecutar:

```powershell
.\mvnw.cmd '-Djpa.mysql.it=true' '-Dtest=IdentidadJpaMySqlTest' test
```

La prueba arranca Spring con `dev`, aplica V1–V9 y valida los mapeos con Hibernate;
usa transacciones revertidas para usuarios y asignaciones de prueba. No ejecutar
ambas suites contra el mismo esquema: cada una exige una base inicialmente vacía.

## Administración de cuentas y roles en MySQL

`AdministracionUsuariosMySqlTest` requiere un **esquema nuevo y vacío distinto** de todas las demás suites. Solo acepta `sabores_oaxaca_it_<nombre>` y conecta exclusivamente a `127.0.0.1`; no acepta el nombre `sabores_oaxaca`. Debe usarse además una cuenta exclusiva con permisos únicamente sobre el esquema temporal, nunca credenciales de producción. El aislamiento por permisos es obligatorio incluso en el VPS. Requiere MySQL Community 8.0.16 o posterior dentro de 8.0, JDK 17 y privilegios DDL/DML limitados a ese esquema. Esta prueba utiliza un índice único temporal y no necesita permisos TRIGGER.

Crear previamente el esquema único y el usuario restringido con un administrador autorizado (sin `IF NOT EXISTS`); no cambiar la base ni los permisos de producción. Desde el directorio `backend` del worktree aislado en Linux:

```bash
export MYSQL_IT_SCHEMA=sabores_oaxaca_it_admin_20261127
export MYSQL_IT_PORT=3306
read -r -p 'Usuario MySQL exclusivo de pruebas: ' MYSQL_IT_USERNAME
export MYSQL_IT_USERNAME
read -r -s -p 'Contraseña MySQL de pruebas: ' MYSQL_IT_PASSWORD
export MYSQL_IT_PASSWORD
bash ./mvnw -Dadmin.mysql.it=true -Dtest=AdministracionUsuariosMySqlTest test
unset MYSQL_IT_PASSWORD MYSQL_IT_USERNAME
```

En PowerShell se usan las variables del ejemplo anterior y ` .\mvnw.cmd '-Dadmin.mysql.it=true' '-Dtest=AdministracionUsuariosMySqlTest' test`. La suite verifica el esquema vacío antes de iniciar Spring, ejecuta V1–V9 y comprueba auditoría, revocación, rollback y concurrencia. Crea y elimina un índice único temporal para provocar el fallo de auditoría, únicamente en ese esquema. Si se interrumpe, inspeccionar el esquema dedicado; no reutilizarlo. No ejecuta Flyway clean ni elimina bases. Para cada nueva ejecución crear otro esquema vacío.

## Actualización de V5 a V6

Con un tercer esquema dedicado vacío y las mismas variables, ejecutar:

```powershell
.\mvnw.cmd '-Dv6.mysql.it=true' '-Dtest=MigracionV6MySqlTest' test
```

La prueba aplica V1–V5 mediante Flyway, inserta datos ficticios y aplica V6; verifica su conservación, las versiones y que una segunda migración no ejecute cambios. Finalmente inicia Spring con validación de Hibernate. No reutilizar el esquema de las otras suites.

## Consultas JPA de recetas

Con otro esquema dedicado y vacío, y las mismas variables `MYSQL_IT_*`:

```powershell
.\mvnw.cmd '-Drecetas.mysql.it=true' '-Dtest=RecetasJpaMySqlTest' test
```

La prueba aplica V1–V9, valida los mapeos con Hibernate y carga datos ficticios en ese esquema. No reutilizarlo para otras suites; no se ejecuta Flyway clean.

La suite de recetas también comprueba rollback de moderación con un trigger temporal de prueba en `auditoria_moderacion`; necesita el privilegio `TRIGGER` limitado al esquema dedicado. En MySQL con binlog activo pueden existir restricciones adicionales para crear triggers; usar preferentemente una instancia aislada con binlog desactivado, sin conceder privilegios globales al usuario de prueba. El trigger se elimina en `finally`, sin alterar migraciones ni restricciones. Si la ejecución se interrumpe, inspeccionar el esquema aislado; no reutilizarlo.

## Favoritos por HTTP y MySQL

Con otro esquema dedicado, autorizado y vacío, y las mismas variables `MYSQL_IT_*`:

```powershell
.\mvnw.cmd '-Dfavoritos.mysql.it=true' '-Dtest=FavoritosMySqlTest' test
```

La prueba verifica el esquema vacío, aplica V1–V9 con Flyway y valida los
mapeos con Hibernate en `dev`.
Usa JWT reales de cuentas ficticias, verifica altas HTTP concurrentes y comprueba
las asociaciones y su visibilidad directamente con MySQL. No reutiliza ni limpia
el esquema; para repetir la suite se necesita otro vacío.
