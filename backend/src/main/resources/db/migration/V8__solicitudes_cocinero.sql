CREATE TABLE solicitudes_cocinero (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT UNSIGNED NOT NULL,
    estado VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
    creada_en DATETIME(6) NOT NULL,
    resuelta_en DATETIME(6) NULL,
    resuelta_por BIGINT UNSIGNED NULL,
    usuario_pendiente BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN estado = 'PENDIENTE' THEN usuario_id ELSE NULL END) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uq_solicitud_pendiente (usuario_pendiente),
    KEY idx_solicitud_usuario (usuario_id, id),
    KEY idx_solicitud_estado (estado, id),
    CONSTRAINT fk_solicitud_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT fk_solicitud_admin FOREIGN KEY (resuelta_por) REFERENCES usuarios(id),
    CONSTRAINT chk_solicitud_estado CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
    CONSTRAINT chk_solicitud_resolucion CHECK ((estado = 'PENDIENTE' AND resuelta_en IS NULL AND resuelta_por IS NULL) OR (estado IN ('APROBADA', 'RECHAZADA') AND resuelta_en IS NOT NULL AND resuelta_por IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
