# Sabores de Oaxaca · Frontend

Aplicación en JavaScript con React, Vite y React Router. Inicio y Catálogo toman
como referencia los frames «01 · Inicio público» y «02 · Explorar recetas» de
Figma; las composiciones de tablet y móvil son adaptaciones del escritorio.
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
| `/recetas/tlayuda` | El detalle provisional y el enlace de vuelta. |
| `/recetas/no-existe` | El mensaje «Receta no encontrada». |
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

## Comprobaciones locales

```sh
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
```

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/tlayuda`.
