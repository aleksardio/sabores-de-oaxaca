# Demostración de Sabores de Oaxaca

[Volver al README](../README.md#demostración-visual) · [Abrir el sitio en producción](https://saboresdeoaxaca.food/)

Evidencias de la interfaz de producción capturadas el 27 de noviembre de 2026 con Chrome y Playwright. Las vistas de escritorio usan una ventana de 1440 × 900 px y las de móvil, una de 390 × 844 px. Algunas imágenes se centran en un componente para mantener legibles sus controles y su contenido. Las capturas están en WebP.

## Inicio

La [portada de escritorio](capturas/inicio/presentacion-y-navegacion.webp) muestra el logotipo oficial, la navegación principal y la presentación del recetario.

Las **recetas destacadas** enlazan a fichas publicadas.

![Tres recetas destacadas en la página de inicio, con sus tarjetas y enlaces a las fichas](capturas/inicio/recetas-destacadas.webp)

La sección de **regiones** enlaza directamente a las fichas regionales de Tradiciones.

![Sección de inicio con el título Ocho regiones, cientos de formas de cocinar y el botón Conocer las regiones](capturas/inicio/acceso-a-las-regiones.webp)

## Explorar recetas

El [catálogo de escritorio](capturas/explorar/catalogo-centrado.webp) muestra el diseño centrado y las fotografías disponibles. Las recetas sin fotografía tienen una ilustración de respaldo.

### Búsqueda por título

La búsqueda de **Enfrijoladas** devuelve la ficha de enfrijoladas oaxaqueñas con tasajo.

![Búsqueda por Enfrijoladas con una receta coincidente en el catálogo](capturas/explorar/busqueda-por-titulo.webp)

### Recetas tradicionales oaxaqueñas

La opción **Tradicionales** limita los resultados a ese tipo de receta.

![Filtro Tradicionales activo con tarjetas etiquetadas como tradicional oaxaqueña](capturas/explorar/filtro-tradicionales.webp)

### Categoría

El selector de categoría muestra solo recetas de **Antojitos** en este ejemplo.

![Catálogo filtrado por la categoría Antojitos con sus resultados](capturas/explorar/filtro-categoria.webp)

### Paginación

El catálogo mostraba **14 recetas en 3 páginas**. Se comprobó que **Siguiente** abre un grupo distinto de fichas y **Anterior** vuelve a la primera página.

![Segunda página con otras tarjetas y los controles Anterior y Siguiente](capturas/explorar/pagina-dos-del-catalogo.webp)

## Detalle de receta

La [ficha de enfrijoladas](capturas/receta/ficha-de-enfrijoladas.webp) muestra la fotografía publicada, su descripción y la atribución a la cuenta de prueba autora.

La receta indica las cantidades para **4 personas** y presenta la preparación como una secuencia de pasos.

![Lista de ingredientes para cuatro personas e instrucciones numeradas de las enfrijoladas](capturas/receta/ingredientes-y-preparacion.webp)

Al cambiar a **2 personas**, las cantidades se recalculan. Volver a **4 personas** restaura los valores originales.

![Selector en dos personas con las cantidades de ingredientes recalculadas](capturas/receta/cantidades-recalculadas.webp)

## Tradiciones

La [presentación de Tradiciones](capturas/tradiciones/presentacion-gastronomica.webp) introduce la gastronomía de Oaxaca. La galería reúne las ocho regiones: Cañada, Costa, Istmo, Mixteca, Papaloapan, Sierra Norte, Sierra Sur y Valles Centrales. Cada tarjeta incluye una fotografía, su crédito y una descripción.

![Galería de las ocho regiones de Oaxaca con fotografías, créditos y descripciones](capturas/tradiciones/las-ocho-regiones.webp)

## Autenticación

**Inicio de sesión.** El formulario vacío muestra el acceso con correo y contraseña, y los enlaces de registro y recuperación.

![Formulario vacío de inicio de sesión con campos de correo electrónico y contraseña](capturas/autenticacion/inicio-de-sesion.webp)

**Registro.** El formulario solicita nombre visible, correo, contraseña y confirmación.

![Formulario vacío de registro con nombre visible, correo y confirmación de contraseña](capturas/autenticacion/registro.webp)

**Recuperación de contraseña.** Se comprobó el formulario. No se solicitó ni se verificó la entrega de un correo.

![Formulario vacío de recuperación de contraseña con un campo de correo electrónico](capturas/autenticacion/recuperacion-de-contrasena.webp)

## Áreas autenticadas

### Usuario registrado

**Favoritos con sesión iniciada.** Tras iniciar sesión manualmente con la cuenta de prueba, se guardaron las enfrijoladas. El botón cambió a **Quitar de favoritos** y la receta apareció en **Mis recetas favoritas**. Al terminar se retiró el favorito temporal y se comprobó que el listado volvió a su estado inicial.

![Detalle de las enfrijoladas con el botón Quitar de favoritos después de guardarlas](capturas/usuario/receta-guardada.webp)

![Listado de recetas favoritas de la sesión de prueba con las enfrijoladas guardadas](capturas/usuario/listado-de-favoritos.webp)

**Reportar una receta.** En una ficha de otra autoría, el formulario pide un motivo y permite revisar el envío. La vista previa ofrece confirmar, volver a editar o cancelar. Se canceló el borrador después de capturar la vista previa: no se envió ningún reporte.

| Formulario | Confirmación previa |
| :---: | :---: |
| ![Formulario con motivo de demostración y botón Revisar envío](capturas/usuario/formulario-de-reporte.webp) | ![Vista previa del reporte con las opciones Confirmar envío, Volver a editar y Cancelar reporte](capturas/usuario/confirmacion-previa-del-reporte.webp) |

### Cocinero

**Mis recetas.** La cuenta de prueba muestra el listado propio, los totales por estado editorial y los controles de búsqueda y filtro. En la página consultada, las recetas visibles estaban publicadas.

![Panel del cocinero con el resumen por estado, el filtro y el listado de recetas propias](capturas/cocinero/panel-y-estados-editoriales.webp)

**Crear receta.** En el editor se seleccionó una categoría y se añadió un ingrediente del catálogo con su cantidad. Estos cambios quedaron en el formulario, sin guardar.

![Editor de receta con una categoría marcada y un ingrediente seleccionado con su cantidad](capturas/cocinero/formulario-de-receta.webp)

**Multimedia.** El selector admite fotos y videos en los formatos y tamaños indicados. No se subieron archivos.

![Sección Multimedia con el selector de fotos y videos y los formatos admitidos](capturas/cocinero/selector-de-fotos-y-videos.webp)

**Envío a revisión.** El formulario indica que primero hay que guardar un borrador. No había un borrador ni una receta rechazada editable en la página consultada, así que la evidencia llega hasta este requisito.

![Pie del editor que indica guardar el borrador antes de enviarlo a revisión](capturas/cocinero/requisito-de-borrador-para-revision.webp)

### Moderador

**Cola de recetas.** El panel muestra el número de pendientes y el filtro por tipo. En el momento de la consulta había **0 recetas pendientes**.

![Cola de moderación con cero recetas pendientes y el filtro por tipo](capturas/moderador/panel-y-cola-de-recetas.webp)

**Reportes.** Se consultó la bandeja y se aplicó el filtro **En revisión**, que devolvió una lista vacía. La captura muestra ese resultado sin exponer nombres ni motivos de los reportes.

![Bandeja de reportes con el filtro En revisión y sin resultados para ese estado](capturas/moderador/reportes-filtrados-por-estado.webp)

## Diseño responsivo

En móvil, el contenido se apila para adaptarse al ancho de pantalla. Compárese con el [inicio de escritorio](capturas/inicio/presentacion-y-navegacion.webp), el [catálogo](capturas/explorar/catalogo-centrado.webp) y la [ficha](capturas/receta/ficha-de-enfrijoladas.webp).

![Inicio móvil con logotipo, navegación y presentación del proyecto](capturas/movil/inicio-movil.webp)

| Catálogo | Detalle de receta |
| :---: | :---: |
| ![Vista móvil del catálogo con filtros apilados y la primera tarjeta en una columna](capturas/movil/catalogo-movil.webp) | ![Vista móvil de la receta de enfrijoladas, con fotografía y descripción](capturas/movil/detalle-de-receta-movil.webp) |

**Vista autenticada.** En móvil, la [lista de favoritos de escritorio](capturas/usuario/listado-de-favoritos.webp) ajusta la tarjeta al ancho disponible y mantiene los accesos para abrir o quitar la receta guardada.

![Vista móvil de Mis recetas favoritas con la tarjeta de enfrijoladas y sus acciones](capturas/movil/favoritos-movil.webp)

## Evidencia pendiente

| Funcionalidad | Estado de la evidencia |
| --- | --- |
| Reproducción de video | Ninguna de las 14 fichas publicadas consultadas contenía un video. |
| Entrega de correo de recuperación | Se comprobó la presencia del formulario. No se solicitó un mensaje. |
| Acción de enviar a revisión | Sin un borrador o una receta rechazada editable en la página consultada. No se creó ni envió una receta. |
| Detalle y opciones de aprobación y rechazo | La cola de moderación estaba vacía. No se tomaron decisiones sobre recetas. |
| Reportes con registros visibles | Se comprobó la bandeja y un filtro sin coincidencias. Se omitieron de la evidencia las filas con datos de reportantes. |
