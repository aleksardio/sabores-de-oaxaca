# Diagrama entidad-relación

Esquema conceptual: las restricciones completas, tipos exactos, índices y dominios están en [MODELO_DATOS.md](MODELO_DATOS.md). `recetas.tipo` es `VARCHAR(30)`; `recetas_ingredientes.cantidad` es `DECIMAL(12,3)` nullable exclusivamente para `AL_GUSTO`, y `nota` es opcional. Las patas indican la opcionalidad de cada relación; no implican borrado en cascada. Las entidades de unión tienen PK compuestas. En auditoría administrativa las FK de recurso son alternativas según el CHECK; `rol_id` solo acompaña cambios de rol.

```mermaid
erDiagram
    USUARIOS ||--o{ USUARIOS_ROLES : tiene
    ROLES ||--o{ USUARIOS_ROLES : asignado
    USUARIOS ||--o{ RECETAS : crea
    USUARIOS ||--o{ RECUPERACIONES_CONTRASENA : solicita
    RECETAS ||--o{ RECETAS_INGREDIENTES : contiene
    INGREDIENTES ||--o{ RECETAS_INGREDIENTES : integra
    RECETAS ||--o{ RECETAS_CATEGORIAS : clasificada
    CATEGORIAS ||--o{ RECETAS_CATEGORIAS : agrupa
    RECETAS ||--o{ RECETAS_MULTIMEDIA : contiene
    USUARIOS ||--o{ FAVORITOS : guarda
    RECETAS ||--o{ FAVORITOS : recibe
    USUARIOS ||--o{ REPORTES : presenta
    RECETAS ||--o{ REPORTES : recibe
    USUARIOS ||--o{ AUDITORIA_MODERACION : realiza
    RECETAS ||--o{ AUDITORIA_MODERACION : afecta
    REPORTES o|--o{ AUDITORIA_MODERACION : origina
    USUARIOS ||--o{ AUDITORIA_ADMINISTRATIVA : actua
    USUARIOS o|--o{ AUDITORIA_ADMINISTRATIVA : afectado
    RECETAS o|--o{ AUDITORIA_ADMINISTRATIVA : afectada
    ROLES o|--o{ AUDITORIA_ADMINISTRATIVA : involucrado

    USUARIOS {
        bigint id PK
        varchar correo UK
        varchar nombre_visible
        varchar contrasena_hash
        bigint version_tokens
        datetime eliminado_en
    }
    ROLES {
        bigint id PK
        varchar codigo UK
    }
    USUARIOS_ROLES {
        bigint usuario_id PK,FK
        bigint rol_id PK,FK
        datetime asignado_en
    }
    RECETAS {
        bigint id PK
        bigint autor_id FK
        varchar titulo
        varchar tipo
        varchar estado
        int porciones_base
        datetime publicado_en
        datetime eliminado_en
    }
    INGREDIENTES {
        bigint id PK
        varchar nombre UK
    }
    RECETAS_INGREDIENTES {
        bigint receta_id PK,FK
        bigint ingrediente_id PK,FK
        decimal cantidad
        varchar unidad
        int orden
        varchar nota
    }
    CATEGORIAS {
        bigint id PK
        varchar nombre UK
    }
    RECETAS_CATEGORIAS {
        bigint receta_id PK,FK
        bigint categoria_id PK,FK
    }
    RECETAS_MULTIMEDIA {
        bigint id PK
        bigint receta_id FK
        varchar tipo
        varchar url
        int orden
    }
    FAVORITOS {
        bigint usuario_id PK,FK
        bigint receta_id PK,FK
        datetime creado_en
    }
    REPORTES {
        bigint id PK
        bigint receta_id FK
        bigint reportante_id FK
        varchar motivo
        varchar estado
    }
    AUDITORIA_MODERACION {
        bigint id PK
        bigint actor_id FK
        bigint receta_id FK
        bigint reporte_id FK
        varchar accion
        varchar estado_receta_anterior
        varchar estado_receta_nuevo
        varchar estado_reporte_anterior
        varchar estado_reporte_nuevo
    }
    AUDITORIA_ADMINISTRATIVA {
        bigint id PK
        bigint actor_id FK
        varchar accion
        bigint usuario_afectado_id FK
        bigint receta_afectada_id FK
        bigint rol_id FK
        varchar detalle
        datetime creado_en
    }
    RECUPERACIONES_CONTRASENA {
        bigint id PK
        bigint usuario_id FK
        binary token_hash UK
        datetime expira_en
        datetime usado_en
        datetime invalidado_en
    }
```
