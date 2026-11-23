# Servicios

`apiClient.js` centraliza las solicitudes a `/api/v1` y los errores.
`recipesService.js` consume recetas y categorías públicas sin Bearer.
`authService.js` consume autenticación y envía Bearer solo en las operaciones
que lo requieren. El proxy de Vite reenvía las consultas al backend durante
el desarrollo. Consulta el [README del frontend](../../README.md) para el
arranque local y los contratos.
