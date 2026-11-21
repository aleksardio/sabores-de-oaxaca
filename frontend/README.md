# Sabores de Oaxaca · Frontend

Aplicación en JavaScript con React, Vite y React Router. Inicio, Catálogo y el
detalle toman como referencia los frames «01 · Inicio público»,
«02 · Explorar recetas» y «04 · Detalle de receta» (2, 4 y 6 personas) de Figma.
Las composiciones de tablet y móvil son adaptaciones del escritorio.
Las ilustraciones se recrean con CSS y las fuentes Fraunces e Inter se cargan
desde Google Fonts.
No requiere iniciar el backend: el catálogo usa datos locales y las pantallas
de acceso no procesan credenciales.

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
| `/login` | El aviso de que el inicio de sesión aún no está disponible. |
| `/registro` | El aviso de que el registro aún no está disponible. |
| `/no-existe` | La página de ruta desconocida y el enlace al inicio. |

Prueba también recargar directamente un detalle y navegar con una ventana
estrecha: el menú debe ajustarse y las tarjetas deben reorganizarse.

«Tradiciones», «Conocer las regiones» y «Por región» están deshabilitados
hasta que exista la página de tradiciones. El selector «Región» sí filtra el
catálogo. «Compartir receta» y «Compartir mi receta» esperan la pantalla de
publicación. La página de registro sigue enlazada desde `/login`.

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
npm test         # Cálculo exacto, HALF_UP, cero aproximado, AL_GUSTO y datos locales
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
```

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/tlayuda`.
