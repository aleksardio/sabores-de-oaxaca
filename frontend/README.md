# Sabores de Oaxaca · Frontend

Aplicación inicial en JavaScript con React, Vite y React Router. El diseño es
provisional y se ajustará al prototipo de Figma. No requiere iniciar el backend:
el catálogo usa datos locales y las pantallas de acceso no procesan credenciales.

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
| `/` | La presentación y el enlace «Explorar recetas». |
| `/recetas` | El catálogo y los enlaces a cada receta. |
| `/recetas/tlayuda` | El detalle provisional y el enlace de vuelta. |
| `/recetas/no-existe` | El mensaje «Receta no encontrada». |
| `/login` | El aviso de que el inicio de sesión aún no está disponible. |
| `/registro` | El aviso de que el registro aún no está disponible. |
| `/no-existe` | La página de ruta desconocida y el enlace al inicio. |

Prueba también recargar directamente un detalle y navegar con una ventana
estrecha: el menú debe ajustarse y las tarjetas deben reorganizarse.

## Comprobaciones locales

```sh
npm run build    # Genera dist/
npm run lint     # Revisa el código con ESLint
npm run preview  # Sirve la compilación localmente después de build
```

En un servidor de producción, configura la entrega de `index.html` para las
rutas del frontend que no sean archivos estáticos, de modo que React Router
pueda resolver enlaces directos como `/recetas/tlayuda`.
