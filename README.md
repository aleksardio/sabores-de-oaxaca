# Sabores de Oaxaca

Aplicación web full stack para descubrir, compartir y moderar recetas tradicionales oaxaqueñas, con cálculo de porciones y funciones por rol.

> **Estado:** planificación inicial. Las funcionalidades todavía no están implementadas.

## Equipo

- **Aleks (integrante 1):** backend con Spring Boot, MySQL, seguridad, integraciones y despliegue.
- **Alexis (integrante 2):** frontend con React, experiencia de usuario, diseño responsive y Figma.

Ambos integrantes participarán en la integración, revisión de cambios, pruebas y documentación. Los commits deberán reflejar trabajo real y verificable de cada uno.

## Tecnología prevista

- **Backend:** Java 17, Spring Boot, Spring Security, JWT, Spring Data JPA, Bean Validation.
- **Base de datos:** MySQL 8 con migraciones Flyway.
- **Frontend:** React + Vite; consumo de la API por HTTPS.
- **Pruebas:** pruebas automatizadas y colecciones Bruno versionadas en el repositorio.
- **Despliegue:** VPS con systemd, Nginx, MySQL y Let's Encrypt.
- **Comunicaciones:** Postfix/JavaMailSender, SMS y WhatsApp (pendiente validar conectividad y proveedores).

## Roles propuestos

`ADMIN`, `MODERADOR`, `COCINERO` y `USUARIO`. Las reglas de permisos y flujos de alta se concretarán antes de programar.

## Estructura prevista

- `backend/`: Spring Boot, API REST, DTOs, servicios, repositorios y migraciones.
- `frontend/`: React, rutas, componentes, formularios y vistas responsive.
- `bruno/`: peticiones y pruebas de la API.
- `docs/`: arquitectura, diagrama ER y documentación técnica.
- `database/`: respaldo SQL de ejemplo, sin secretos ni datos personales.

## Diseño

[Prototipo navegable de Sabores de Oaxaca en Figma](https://www.figma.com/design/x3Ny7TxoDdnTldzxbUAz6u/Sabores-de-Oaxaca-%C2%B7-Proyecto-Final-%C2%B7-Prototipo-Navegable?node-id=0-1)

## Desarrollo colaborativo

Trabajar en ramas por funcionalidad (`feat/backend-...`, `feat/frontend-...`), abrir pull requests y revisar los cambios antes de integrarlos a `main`. Las tareas se administrarán en un GitHub Project público con Backlog, To Do, In Progress, In Review y Done.

**Pendiente antes de la entrega:** documentación completa, diagrama ER, instrucciones de instalación, credenciales de evaluación (nunca credenciales reales), URL HTTPS, URL base de API y enlace del tablero público.
