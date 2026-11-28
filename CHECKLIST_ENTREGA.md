# Checklist de entrega final

Este checklist separa lo que está documentado o fue comunicado por el equipo de
lo que aún requiere evidencia. No sustituye el enunciado oficial ni la aceptación.

- [x] README de instalación, arquitectura, roles, pruebas y contratos REST.
- [x] Colección Bruno con ejemplos administrativos y advertencia sobre escrituras.
- [x] Según informó el equipo, PR #60 fusionado y desplegado; en MySQL 8 aislado se comprobaron listado, baja, ocultación pública, conflicto de versión, restauración a `PENDIENTE`, auditorías, conservación de ingredientes y categorías, `401` y `403`. Es información proporcionada por el equipo, no una prueba repetida durante esta edición.
- [ ] Cumplir y acreditar el mínimo oficial de 10–15 registros por tabla principal. Producción verificada: 8 categorías, 40 ingredientes, 19 recetas (18 publicadas) y 9 usuarios activos. Los roles asignados son `ADMIN` 2, `COCINERO` 6, `MODERADOR` 1 y `USUARIO` 9; una cuenta puede tener varios. Faltan conteos de las demás tablas principales. El seed propone cinco categorías, pero no se ha ejecutado; no se acreditan 13 en producción.
- [ ] Reunir y revisar evidencias de los cuatro roles, flujos de interfaz, accesibilidad y presentación; no se inspeccionó `evidencias/`.
- [ ] Repetir las pruebas y compilaciones en el commit candidato; registrar resultados, versiones y pruebas omitidas sin incluir datos personales. En el VPS se aprobaron 217 pruebas frontend antes del despliegue del PR #71; la ejecución local posterior no concluyó satisfactoriamente por dependencias faltantes (140 pruebas aprobadas y 8 archivos fallidos al cargar).
- [ ] Confirmar configuración y entrega reales de correo de recuperación y SMS en un entorno autorizado, si forman parte de la demostración. Están deshabilitados por defecto; `200` de recuperación no garantiza entrega.
- [ ] Acreditar restauración de un respaldo MySQL en esquema aislado y respaldo/restauración de multimedia; no basta con tener un dump.
- [ ] Comprobar HTTPS, acceso, roles y flujos tras cada despliegue autorizado, sin pruebas destructivas en producción.
- [x] Retirado el directorio público de autores de demostración, sin alterar los autores reales de las recetas.
- [ ] Revisar el contenido público de la entrega para excluir credenciales, tokens, teléfonos y datos personales. Google y WhatsApp no deben presentarse como integraciones operativas.
- [x] Diagrama ER Mermaid y migraciones Flyway V1–V9 documentados en el README.
- [x] Enlaces a GitHub Projects y Figma incluidos en el README; falta acreditar la navegabilidad pública de Figma.
- [ ] Acreditar correo real con Postfix y entrega externa; WhatsApp no está implementado. La entrega SMS tampoco está acreditada.
- [ ] Completar o reconocer como parcial el CRUD administrativo: catálogos de solo lectura, cuentas sin alta o edición general y recetas sin CRUD general.
- [ ] Preparar, revisar y restaurar en un esquema aislado un respaldo SQL ficticio importable para la entrega; el seed no lo sustituye.
- [ ] Preparar credenciales temporales de evaluación para los roles requeridos y entregarlas por un canal privado seguro; no publicar credenciales reales. No se acredita que esas cuentas existan.
