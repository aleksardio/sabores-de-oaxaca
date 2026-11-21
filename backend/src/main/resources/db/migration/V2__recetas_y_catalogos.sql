CREATE TABLE ingredientes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    creado_en DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ingredientes_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE categorias (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE recetas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    autor_id BIGINT UNSIGNED NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    preparacion MEDIUMTEXT NOT NULL,
    tipo VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
    estado VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
    porciones_base INT UNSIGNED NOT NULL,
    creado_en DATETIME(6) NOT NULL,
    actualizado_en DATETIME(6) NOT NULL,
    publicado_en DATETIME(6) NULL,
    eliminado_en DATETIME(6) NULL,
    PRIMARY KEY (id),
    KEY idx_recetas_estado (estado, eliminado_en, publicado_en, id),
    KEY idx_recetas_autor (autor_id, estado, eliminado_en, id),
    KEY idx_recetas_titulo (titulo, id),
    CONSTRAINT fk_recetas_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_recetas_tipo CHECK (tipo IN ('TRADICIONAL_OAXAQUENA', 'COMUN')),
    CONSTRAINT chk_recetas_estado CHECK (estado IN ('BORRADOR', 'PENDIENTE', 'PUBLICADA', 'RECHAZADA', 'ARCHIVADA')),
    CONSTRAINT chk_recetas_porciones CHECK (porciones_base > 0)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE recetas_ingredientes (
    receta_id BIGINT UNSIGNED NOT NULL,
    ingrediente_id BIGINT UNSIGNED NOT NULL,
    cantidad DECIMAL(12,3) NULL,
    unidad VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
    orden INT UNSIGNED NOT NULL,
    nota VARCHAR(255) NULL,
    PRIMARY KEY (receta_id, ingrediente_id),
    UNIQUE KEY uq_recetas_ingredientes_orden (receta_id, orden),
    KEY idx_recetas_ingredientes_ingrediente (ingrediente_id, receta_id),
    CONSTRAINT fk_recetas_ingredientes_receta FOREIGN KEY (receta_id) REFERENCES recetas (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_recetas_ingredientes_ingrediente FOREIGN KEY (ingrediente_id) REFERENCES ingredientes (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_recetas_ingredientes_unidad CHECK (unidad IN ('G', 'KG', 'ML', 'L', 'PIEZA', 'CUCHARADA', 'CUCHARADITA', 'TAZA', 'AL_GUSTO')),
    CONSTRAINT chk_recetas_ingredientes_cantidad CHECK (
        (unidad = 'AL_GUSTO' AND cantidad IS NULL)
        OR (unidad IN ('G', 'KG', 'ML', 'L', 'PIEZA', 'CUCHARADA', 'CUCHARADITA', 'TAZA') AND cantidad IS NOT NULL AND cantidad > 0)
    ),
    CONSTRAINT chk_recetas_ingredientes_orden CHECK (orden > 0)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE recetas_categorias (
    receta_id BIGINT UNSIGNED NOT NULL,
    categoria_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (receta_id, categoria_id),
    KEY idx_recetas_categorias_categoria (categoria_id, receta_id),
    CONSTRAINT fk_recetas_categorias_receta FOREIGN KEY (receta_id) REFERENCES recetas (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_recetas_categorias_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE recetas_multimedia (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    receta_id BIGINT UNSIGNED NOT NULL,
    tipo VARCHAR(10) COLLATE utf8mb4_0900_as_cs NOT NULL,
    url VARCHAR(2048) NOT NULL,
    texto_alternativo VARCHAR(255) NULL,
    orden INT UNSIGNED NOT NULL,
    creado_en DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_recetas_multimedia_orden (receta_id, orden),
    CONSTRAINT fk_recetas_multimedia_receta FOREIGN KEY (receta_id) REFERENCES recetas (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_recetas_multimedia_tipo CHECK (tipo IN ('IMAGEN', 'VIDEO')),
    CONSTRAINT chk_recetas_multimedia_orden CHECK (orden > 0)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
