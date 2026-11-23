# Plan propuesto de migraciones

Las migraciones ejecutables están en `src/main/resources/db/migration/`. Cada migración versionada es inmutable tras aplicarse en un entorno compartido; cambios posteriores se hacen con una nueva versión. MySQL realiza commits implícitos en muchos DDL: no asumir rollback transaccional completo, preparar respaldo y ensayar recuperación ante fallos parciales.

## Orden y dependencias

| Versión | Contenido propuesto | Requiere |
|---|---|---|
| V1 | `usuarios`, `roles` y `usuarios_roles`; claves e índices | Ninguna |
| V2 | `ingredientes`, `categorias`, `recetas`, `recetas_ingredientes`, `recetas_categorias` y `recetas_multimedia` | Usuarios de V1; catálogos y recetas antes que asociaciones |
| V3 | `favoritos`, `reportes`, `auditoria_moderacion`, `auditoria_administrativa` | Usuarios y roles de V1, recetas de V2; reportes antes de auditoría de moderación |
| V4 | `recuperaciones_contrasena` | Usuarios de V1 |
| V5 | Datos de referencia: cuatro roles y, únicamente si se aprueba su catálogo oficial, categorías iniciales | V1 y V2 |
| V6 | Añade `usuarios.version_perfil BIGINT NOT NULL DEFAULT 0` para bloqueo optimista | V1–V5 |

Cada tabla se creará con InnoDB, charset/colación, PK, FK, CHECK, índices y restricciones acordados. En V2, prever `recetas.tipo VARCHAR(30)` y el CHECK de unidad/cantidad con tratamiento explícito de NULL y catálogo cerrado; en V3, las FK tipadas y CHECK por acción de la auditoría administrativa y las restricciones de pares de estados de moderación. No crear una FK polimórfica. `version_tokens` forma parte de V1; no se propone tabla de revocación individual de tokens. La configuración de MySQL debe verificar versión mínima 8.0.16, zona UTC y soporte de las colaciones; asegurar que Flyway corre con la base seleccionada y permisos mínimos necesarios. Antes de activar `ddl-auto=validate`, alinear nombres, tipos, precisión y convenciones con futuras entidades y comprobar en MySQL real.

## Datos de referencia y demostración

- Los roles `ADMIN`, `MODERADOR`, `COCINERO`, `USUARIO` son catálogo esencial e idéntico entre entornos. V5 los incorpora por código estable, sin usuarios asociados; no asumir valores numéricos de ID. Las categorías son catálogo editable: acordar una lista oficial antes de incluirla en V5; no sembrar categorías hipotéticas como obligatorias. Las modificaciones posteriores de referencia se gestionan en versiones nuevas y sin sobrescribir cambios administrativos inadvertidamente.
- Los datos de demostración no van en migraciones comunes ni se ejecutan en producción. Diseñar carga separada y explícita, solo para una base local o de pruebas identificada, con una ubicación Flyway específica de ese entorno o herramienta independiente; mantenerla excluida de las ubicaciones de producción. Si se usa Flyway, distinguir su historial y numeración para evitar conflictos con V futuras, y ensayar desde una base vacía. No se propone implementarla todavía.
- Plan de volumen: 10–15 ingredientes ficticios o genéricos; 10–15 categorías solo si son útiles y aprobadas; 10–15 recetas de demostración con instrucciones originales y relaciones coherentes, al menos un ingrediente y categoría por receta. Crear un conjunto menor de cuentas inequívocamente ficticias y locales, y asignar roles necesarios; completar 10–15 filas en asociaciones principales, favoritos y reportes solo cuando los escenarios lo justifiquen. No es obligatorio forzar 10–15 roles, usuarios ni eventos de seguridad. Probar estados y permisos con escenarios variados sin presentar el material como contenido real o validado culturalmente.
- No introducir correos de personas reales, credenciales reutilizables, tokens ni secretos en el repositorio. Para pruebas de autenticación, generar hashes a partir de valores efímeros suministrados localmente; no incorporar contraseñas conocidas al conjunto compartido ni habilitar cuentas ficticias fuera de desarrollo. Usar dominios reservados `.invalid` y material multimedia local o referencias ficticias sin dependencias de servicios externos.

## Verificaciones previas a desplegar

1. Revisar cardinalidades, índices, reglas de transición, mínimos de publicación y política de bajas con el equipo; resolver las decisiones abiertas de [REGLAS_NEGOCIO.md](REGLAS_NEGOCIO.md).
2. En una instancia MySQL 8 de pruebas, aplicar migraciones desde cero y comprobar restricciones, claves, Unicode, fechas UTC y relaciones; no usar datos productivos. Probar todas las combinaciones válidas e inválidas de unidad y cantidad, especialmente NULL con unidades numéricas; comprobar los CHECK de auditoría y FK. Probar concurrencia en favoritos, publicación, restauración y consumo de recuperación, y atomicidad del cambio y sus auditorías.
3. Verificar que el usuario de migración y el usuario de ejecución tengan privilegios separados; revisar plan de respaldo, restauración y actualización en un entorno con datos existentes.
4. Comprobar orden de arranque Flyway/JPA y `validate`, búsquedas/paginación con volumen realista y recuperación tras un fallo DDL. Mantener el perfil `bootstrap` como comprobación de arranque, no como validación de MySQL ni como configuración productiva.

## Aprobaciones pendientes

El catálogo inicial de unidades y la representación de `AL_GUSTO`, el retiro a borrador, la revisión tras restaurar una receta publicada, la auditoría administrativa y el cierre global están definidos en los otros documentos. Siguen pendientes: repetición de un ingrediente con diferentes preparaciones, política de retención/privacidad y acceso a auditorías, almacenamiento multimedia, límites de porciones, catálogo de categorías y criterios culturales para datos demostrativos. Evaluar si el retorno a visibilidad de recetas publicadas al reactivar a su autor satisface la política del equipo; no se desbloquean recetas archivadas.
