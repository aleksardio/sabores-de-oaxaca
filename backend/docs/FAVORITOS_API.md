# API de favoritos

Las tres operaciones requieren `Authorization: Bearer <JWT>`. Spring Security
usa el validador y el conversor existentes: el ID de usuario proviene del
principal autenticado, después de verificar la cuenta activa y `version_tokens`.
No se admiten parámetros de consulta ni cuerpo. `recetaId` es un entero decimal
positivo en el rango de `long`.

| Método | Ruta | Resultado |
| --- | --- | --- |
| `GET` | `/api/v1/favoritos` | `200`, arreglo de resúmenes de recetas visibles del usuario actual. Si no hay, `[]`. |
| `POST` | `/api/v1/favoritos/{recetaId}` | `204` sin cuerpo si se agregó o ya existía y la receta sigue visible. |
| `DELETE` | `/api/v1/favoritos/{recetaId}` | `204` sin cuerpo si se quitó o no existía la asociación propia. No comprueba si la receta existe o es pública. |

Ejemplo de respuesta a `GET`, en formato `RecetasDto.Resumen`:

```json
[
  {
    "id": 1,
    "titulo": "Mole",
    "descripcion": "Preparación",
    "tipo": "TRADICIONAL_OAXAQUENA",
    "porcionesBase": 4,
    "autor": { "id": 1, "nombreVisible": "Autora", "avatarUrl": null },
    "categorias": []
  }
]
```

### Errores

| Código | Motivo |
| --- | --- |
| `400` | ID inválido o entrada no admitida. |
| `401` | Falta el JWT, no es válido, expiró, fue revocado o la cuenta dejó de estar activa. |
| `403` | Spring Security denegó la solicitud (p. ej., método no autorizado con sesión válida); un origen CORS no permitido también puede recibir `403`. |
| `404` | En `POST`: receta inexistente o no visible, sin distinguir el motivo. |

Ejemplo de error JSON de `POST`:

```json
{ "error": "Receta no encontrada" }
```

### Visibilidad e idempotencia

- Solo se puede agregar y listar una receta `PUBLICADA`, no eliminada y de un
  autor activo. Una baja, un cambio editorial o la desactivación del autor
  oculta la asociación sin borrarla. Si la receta vuelve a ser visible, la
  asociación reaparece. `DELETE` elimina físicamente solo la asociación propia.
- `GET` ordena por `creado_en DESC, receta_id DESC`. Carga el autor en la consulta
  y las categorías en un lote, sin consultas por tarjeta. No expone entidades JPA
  ni datos privados del autor.
- `POST` usa una transacción con lectura bloqueante compartida (`FOR SHARE`) de
  la receta y el autor. Un `INSERT … ON DUPLICATE KEY UPDATE` sin cambio aprovecha
  la PK compuesta de V3 para resolver duplicados concurrentes sin modificar la
  fecha original. No se usa `INSERT IGNORE` ni se cambian recetas o auditorías.
- `DELETE` afecta filas solo por la clave `(usuario_id, receta_id)`. Repetirlo
  no produce error ni revela la existencia de recetas ocultas.

### Seguridad y coordinación

En `SecurityConfig.java` se añadieron tres matchers autenticados: `GET` de la
colección y `POST`/`DELETE` del elemento, antes de `anyRequest().denyAll()`.
Se añadió una regla CORS más específica para `/api/v1/favoritos/{recetaId}` con
solo `POST` y `DELETE`, reutilizando los mismos orígenes y encabezados exactos,
sin credenciales. La regla general mantiene `GET` y `POST`. No cambian rutas
públicas, validación ni revocación JWT. Si la rama de CRUD también toca
`SecurityConfig.java`, conservar ambos conjuntos de matchers específicos y
revisar el orden de las reglas CORS; favoritos no agrega ni modifica V7.

### Pruebas y límites

`FavoritosHttpTest` se ejecuta con `.\mvnw.cmd clean verify` (JDK 17) y cubre
rutas, Bearer, errores y CORS con MockMvc. Para comprobar los mapeos, las
escrituras concurrentes, la revocación y la conservación de asociaciones en un
servidor real, seguir [PRUEBAS_MYSQL.md](../src/test/PRUEBAS_MYSQL.md):

```powershell
.\mvnw.cmd '-Dfavoritos.mysql.it=true' '-Dtest=FavoritosMySqlTest' test
```

Usar otro esquema vacío dedicado y autorizado con las variables `MYSQL_IT_*`.
La prueba no limpia ni reutiliza el esquema. La implementación usa SQL de MySQL
8.0.16+ y la tabla de V3. La lista aún no tiene paginación y el `GET` no
ofrece un inventario de asociaciones ocultas; para quitar una por API se necesita
conocer su ID. La recarga del navegador no conserva la sesión JWT; volver a
autenticarse recupera los favoritos persistidos.
