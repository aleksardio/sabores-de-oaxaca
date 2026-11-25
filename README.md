# Sabores de Oaxaca

Aplicación web para descubrir, compartir y moderar recetas oaxaqueñas. Incluye catálogo público, detalle con ajuste de porciones, registro e inicio de sesión, favoritos, edición y envío de recetas, moderación y reportes. El backend también ofrece administración de usuarios y roles, subida de multimedia y recuperación de contraseña bajo configuración explícita. No todos estos flujos están integrados en la interfaz; consultar [limitaciones](#limitaciones-y-pendientes).

## Tecnologías y arquitectura

- **Frontend:** React 19 y Vite, con cliente HTTP para la API.
- **Backend:** Java 17, Spring Boot 4.1.2, Spring Security, JWT, BCrypt, Bean Validation y Spring Data JPA. Controladores, DTOs, servicios transaccionales y repositorios separan las responsabilidades.
- **Datos:** MySQL 8.0 y migraciones Flyway V1–V7; archivos multimedia externos referenciados mediante HTTPS.
- **Despliegue previsto:** API y frontend detrás de Nginx con TLS en un VPS. Los archivos de subida necesitan almacenamiento persistente independiente del repositorio y de `dist`.

La API expone `/api/v1`. Las rutas públicas permiten consultar recetas publicadas visibles, categorías e ingredientes. La autorización se comprueba en el servidor; el frontend no sustituye sus reglas. Los contratos específicos están en [`backend/docs/`](backend/docs/).

## Roles

Los roles no son jerárquicos: una cuenta puede tener varios.

| Rol | Funciones de backend |
| --- | --- |
| `USUARIO` | Autenticarse, gestionar favoritos y reportar recetas visibles ajenas. |
| `COCINERO` | Crear y editar sus borradores o rechazadas, enviar a revisión y subir multimedia. |
| `MODERADOR` | Revisar recetas y resolver reportes, sin decidir sobre sus propios reportes o recetas. |
| `ADMIN` | Administrar usuarios y asignar o retirar `COCINERO`; también puede moderar con las mismas restricciones de conflicto de interés. |

El registro público no concede privilegios administrativos. La edición y las decisiones requieren versiones vigentes cuando el contrato lo indica. Ver [recetas propias](backend/docs/RECETAS_COCINERO_API.md), [moderación](backend/docs/MODERACION_API.md), [reportes](backend/docs/REPORTES_API.md) y [administración](backend/docs/ADMIN_USUARIOS_API.md).

## Requisitos y ejecución local

Se requieren JDK 17, MySQL Community 8.0.16–8.0.x, Node.js y npm compatibles con Vite 8 y React 19, y Git. El backend incluye Maven Wrapper. Crear una base **de desarrollo** vacía y una cuenta MySQL limitada a esa base. No utilizar datos de producción para pruebas destructivas.

En la terminal del backend, configurar mediante variables de entorno `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` y `JWT_SECRET_BASE64` (clave aleatoria Base64 de al menos 32 bytes). No guardar secretos reales en Git. Para el perfil `dev`:

```sh
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

En Windows usar `mvnw.cmd`. El perfil `dev` habilita Flyway, aplica las migraciones pendientes y valida el esquema con Hibernate; no hace `clean` ni actualiza tablas por Hibernate. Ante una base existente sin historial Flyway, revisar y respaldar antes de intervenir; no aplicar baseline o repair automáticamente. El perfil `bootstrap` solo sirve para comprobar el arranque sin MySQL y no representa una aplicación funcional. Ver [configuración backend](backend/README.md), teniendo en cuenta que sus apartados de estado y versión de migraciones pueden estar desactualizados.

Para el frontend, en otra terminal:

```sh
cd frontend
npm ci
npm run dev
```

Consultar [`frontend/README.md`](frontend/README.md) para las variables y modos del cliente. Para permitir el navegador local, configurar `CORS_ALLOWED_ORIGINS` con orígenes exactos cuando no se use el valor de `dev`; no incluir comodines ni secretos.

## Compilación y pruebas

```sh
cd backend
./mvnw clean verify
```

```sh
cd frontend
npm test
npm run build
```

Las pruebas MySQL son optativas y necesitan un esquema aislado nuevo, vacío y una cuenta de permisos limitados; no se activan con el comando habitual. Leer [`backend/src/test/PRUEBAS_MYSQL.md`](backend/src/test/PRUEBAS_MYSQL.md) antes de ejecutarlas. Los detalles de esquema, datos ficticios y respaldo están en [`database/README.md`](database/README.md); el diagrama [ER](backend/docs/DIAGRAMA_ER.md) describe las relaciones principales.

## Bruno

Importar la carpeta [`bruno/`](bruno/) con **Open Collection**, seleccionar el entorno y proporcionar localmente los ID, JWT y credenciales de cuentas de prueba. La colección incluye comprobaciones positivas y negativas; algunas modifican datos o revocan sesiones. Ejecutarlas individualmente y solo en un entorno autorizado. No versionar tokens, contraseñas ni respuestas sensibles. Consultar [`bruno/README.md`](bruno/README.md) para precondiciones y secuencia.

## Despliegue y HTTPS

El dominio previsto para los enlaces de recuperación es `https://saboresdeoaxaca.food`; su disponibilidad, DNS, certificado y despliegue efectivo deben verificarse en el entorno destino. Configurar Nginx, TLS, CORS, base y secretos externamente; no usar el perfil `bootstrap` en producción. La subida requiere `APP_UPLOAD_DIR` y `APP_UPLOAD_PUBLIC_ORIGIN`, volumen persistente y publicación controlada por Nginx: ver [multimedia](backend/docs/MULTIMEDIA_UPLOADS_API.md). Coordinar respaldos de MySQL y archivos externos.

## Limitaciones y pendientes

- La recuperación está deshabilitada por defecto. Requiere configuración explícita y un transporte SMTP verificado; el VPS de DigitalOcean tiene salida SMTP restringida. No se garantiza entrega a proveedores externos. Ver [recuperación](backend/docs/RECUPERACION_CONTRASENA_API.md).
- El inicio con Google y las notificaciones SMS no deben considerarse implementados ni operativos; WhatsApp está omitido del alcance.
- Los paneles administrativos que siguen usando datos demo no representan necesariamente las API reales de administración y reportes. Confirmar la integración de cada vista antes de la entrega.
- Las URL multimedia de los datos ficticios no son imágenes reales. El script demo prepara 13 recetas y 27 ingredientes; falta confirmar los mínimos oficiales de la asignación.
- Para producción quedan por verificar la protección distribuida contra abuso, los respaldos y la publicación de archivos; consultar los contratos por módulo.

## Diseño, código y colaboración

- [Prototipo Figma](https://www.figma.com/design/x3Ny7TxoDdnTldzxbUAz6u/Sabores-de-Oaxaca-%C2%B7-Proyecto-Final-%C2%B7-Prototipo-Navegable?node-id=0-1)
- [Repositorio GitHub](https://github.com/aleksardio/sabores-de-oaxaca)

Aleks participa principalmente en backend, seguridad y despliegue; Alexis, en frontend y diseño. Trabajar en ramas por funcionalidad, ejecutar las pruebas aplicables, abrir Pull Requests y revisar contratos y cambios antes de integrarlos. No incluir credenciales ni información personal en commits o capturas.
