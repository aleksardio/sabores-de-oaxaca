# Sabores de Oaxaca · Frontend

Aplicación en JavaScript con React, Vite y React Router. Inicio, Catálogo y el
detalle toman como referencia los frames «01 · Inicio público»,
«02 · Explorar recetas» y «04 · Detalle de receta» (2, 4 y 6 personas) de Figma.
Las composiciones de tablet y móvil son adaptaciones del escritorio.
Las ilustraciones se recrean con CSS y las fuentes Fraunces e Inter se cargan
desde Google Fonts.
No requiere iniciar el backend: el catálogo usa datos locales y los formularios
de autenticación solo validan entradas en el navegador.

## Instalar y ejecutar

Usa Node.js 22.13 o posterior (se recomienda Node.js 24) y npm.
Desde la raíz del repositorio:

```sh
cd frontend
npm ci
npm run dev
```

Abre la URL que indique Vite (habitualmente `http://localhost:5173`).

## Probar la navegación

| Ruta | Qué comprobar |
| --- | --- |
| `/` | La portada, «Explorar recetas», las tres tarjetas destacadas y sus enlaces «Ver receta». |
| `/recetas` | El catálogo, la búsqueda, los filtros, las páginas de seis recetas y los enlaces a cada detalle. |
| `/recetas/tlayuda` | Ingredientes, preparación, base de dos porciones y enlace de vuelta. |
| `/recetas/no-existe` | El mensaje «Receta no encontrada» y el enlace al catálogo. |
| `/login` | Acceso con correo y contraseña, mostrar u ocultar contraseña y enlaces a alta y recuperación. |
| `/registro` | Alta con nombre visible, correo, contraseña y confirmación. |
| `/recuperar-contrasena` | Solicitud de recuperación por correo y enlace de regreso al login. |
| `/no-existe` | La página de ruta desconocida y el enlace al inicio. |

Prueba también recargar directamente un detalle y navegar con una ventana
estrecha: el menú debe ajustarse y las tarjetas deben reorganizarse.

«Tradiciones», «Conocer las regiones» y «Por región» están deshabilitados
hasta que exista la página de tradiciones. El selector «Región» sí filtra el
catálogo. «Compartir receta» y «Compartir mi receta» esperan la pantalla de
publicación.

### Formularios de autenticación

Las tres rutas usan un layout propio inspirado en los frames 06, 07 y 08
de Figma, sin la cabecera ni el pie públicos. En pantallas estrechas el
panel de marca se compacta y el formulario queda en una columna.

- En login, envía los campos vacíos, prueba un correo sin `@` y usa
  **Mostrar/Ocultar contraseña** con el teclado.
- En registro, prueba los campos vacíos, contraseñas diferentes, un nombre
  de 101 caracteres o un correo de 255. Los máximos son 100 y 254,
  respectivamente. No se solicita un rol ni se exige una composición de
  contraseña pendiente de acuerdo con Aleks.
- En recuperación, prueba un correo vacío y uno mal formado. Regresa a login
  y recorre los enlaces a las tres pantallas y al inicio.
- Al corregir un error, su mensaje debe desaparecer. Un envío válido solo
  anuncia que la función estará disponible cuando se conecte el servidor.
  No se inicia sesión, crea una cuenta ni envía un correo. No hay peticiones,
  tokens ni almacenamiento de credenciales; las contraseñas se limpian tras
  un envío válido.
- Revisa las tres rutas a **320, 390, 768 y 1440 px**: sin desplazamiento
  horizontal, con las acciones accesibles y scroll vertical cuando se necesite.

Para la integración faltan el contrato de la API, la política de contraseña,
el manejo de sesión y destinos según permisos del servidor, y el flujo de
restablecimiento desde un enlace de recuperación.

### Búsqueda y filtros del catálogo

- Escribe y pulsa **Enter** o **Buscar recetas**. La consulta ignora
  mayúsculas y acentos y busca cada palabra en el nombre, los ingredientes,
  la categoría, la región o la duración mostrada. Prueba `MAIZ MIXTECA`.
- Se puede combinar una región con un filtro: **Tradicionales** usa la
  marca de tradición, **Rápidas** incluye hasta **30 minutos**, **Dulces** y
  **Bebidas** usan la categoría, y **Con video** usa un indicador de prueba
  (no hay reproductor ni videos enlazados). **Todas** no limita por tipo.
- **Limpiar filtros** también borra la búsqueda. Cambiar la búsqueda, el
  filtro o la región vuelve a la primera página.

Los registros y sus metadatos son provisionales. La API todavía no interviene
en el listado, la búsqueda, los filtros, la paginación ni los detalles.

### Detalle y calculadora de porciones

- Recorre las tres páginas del catálogo (6, 6 y 2 tarjetas) y abre cada enlace
  «Ver receta». Deben verse el nombre correspondiente, los ingredientes y la preparación.
- En `/recetas/mole-negro`, prueba **4 → 2 → 6 → 4**. El pollo debe mostrar
  **300 → 150 → 450 → 300 g**, y las tortillas **2 → 1 → 3 → 2 piezas**.
  La URL no cambia. El botón activo se distingue visualmente y con `aria-pressed`.
- En `/recetas/ensalada-de-nopales-con-quesillo`, el detalle abre para **3 personas**
  sin que ninguno de los tres botones esté marcado. Al cambiar el número,
  la sal sigue mostrando **«Al gusto»**.
- Comprueba los anchos **320, 390, 768 y 1440 px** con las herramientas del
  navegador. En celular las tarjetas se apilan; no debe aparecer desplazamiento horizontal.
- Vuelve al catálogo y busca `MAIZ MIXTECA`: debe aparecer **Memelas**.
  Comprueba también la paginación y la combinación de **Bebidas** con **Valles Centrales**.

En `src/data/recipes.js`, `ingredients` conserva sus cadenas para la búsqueda.
El detalle usa `baseServings`, `ingredientDetails` y `preparation`. Las cantidades
base son decimales en texto con punto (o `null` para `AL_GUSTO`); la vista usa
coma decimal y mantiene la unidad original. `preparation` es texto: cada línea
no vacía se muestra como un paso. Las cantidades e instrucciones son
demostrativas, no versiones históricas verificadas.

## Comprobaciones locales

```sh
npm test         # Validación de formularios, porciones y datos locales
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
```

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/tlayuda`.
