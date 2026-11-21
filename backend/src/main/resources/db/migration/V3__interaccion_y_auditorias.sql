CREATE TABLE favoritos (
    usuario_id BIGINT UNSIGNED NOT NULL,
    receta_id BIGINT UNSIGNED NOT NULL,
    creado_en DATETIME(6) NOT NULL,
    PRIMARY KEY (usuario_id, receta_id),
    KEY idx_favoritos_receta (receta_id, usuario_id),
    CONSTRAINT fk_favoritos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_favoritos_receta FOREIGN KEY (receta_id) REFERENCES recetas (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE reportes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    receta_id BIGINT UNSIGNED NOT NULL,
    reportante_id BIGINT UNSIGNED NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    estado VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
    creado_en DATETIME(6) NOT NULL,
    actualizado_en DATETIME(6) NOT NULL,
    resuelto_en DATETIME(6) NULL,
    PRIMARY KEY (id),
    KEY idx_reportes_estado (estado, creado_en, id),
    KEY idx_reportes_receta (receta_id, creado_en, id),
    KEY idx_reportes_reportante (reportante_id, creado_en, id),
    CONSTRAINT fk_reportes_receta FOREIGN KEY (receta_id) REFERENCES recetas (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_reportes_reportante FOREIGN KEY (reportante_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_reportes_estado CHECK (estado IN ('ABIERTO', 'EN_REVISION', 'RESUELTO', 'DESCARTADO')),
    CONSTRAINT chk_reportes_resolucion CHECK (
        (estado IN ('ABIERTO', 'EN_REVISION') AND resuelto_en IS NULL)
        OR (estado IN ('RESUELTO', 'DESCARTADO') AND resuelto_en IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Las FK usadas por CHECK omiten ON DELETE/UPDATE: InnoDB aplica NO ACTION,
-- equivalente a RESTRICT, sin acciones referenciales explícitas incompatibles.
CREATE TABLE auditoria_moderacion (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_id BIGINT UNSIGNED NOT NULL,
    receta_id BIGINT UNSIGNED NOT NULL,
    reporte_id BIGINT UNSIGNED NULL,
    accion VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
    estado_receta_anterior VARCHAR(20) COLLATE utf8mb4_0900_as_cs NULL,
    estado_receta_nuevo VARCHAR(20) COLLATE utf8mb4_0900_as_cs NULL,
    estado_reporte_anterior VARCHAR(20) COLLATE utf8mb4_0900_as_cs NULL,
    estado_reporte_nuevo VARCHAR(20) COLLATE utf8mb4_0900_as_cs NULL,
    detalle VARCHAR(1000) NULL,
    creado_en DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_audmod_receta (receta_id, creado_en, id),
    KEY idx_audmod_actor (actor_id, creado_en, id),
    KEY idx_audmod_reporte (reporte_id, creado_en, id),
    CONSTRAINT fk_audmod_actor FOREIGN KEY (actor_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_audmod_receta FOREIGN KEY (receta_id) REFERENCES recetas (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_audmod_reporte FOREIGN KEY (reporte_id) REFERENCES reportes (id),
    CONSTRAINT chk_audmod_accion CHECK (accion IN ('APROBAR', 'RECHAZAR', 'ARCHIVAR', 'RESTAURAR', 'RESTAURAR_BAJA', 'REVISAR_REPORTE', 'RESOLVER_REPORTE', 'DESCARTAR_REPORTE')),
    CONSTRAINT chk_audmod_estados_receta CHECK (
        (estado_receta_anterior IS NULL AND estado_receta_nuevo IS NULL)
        OR (estado_receta_anterior IS NOT NULL AND estado_receta_nuevo IS NOT NULL
            AND estado_receta_anterior IN ('BORRADOR', 'PENDIENTE', 'PUBLICADA', 'RECHAZADA', 'ARCHIVADA')
            AND estado_receta_nuevo IN ('BORRADOR', 'PENDIENTE', 'PUBLICADA', 'RECHAZADA', 'ARCHIVADA'))
    ),
    CONSTRAINT chk_audmod_estados_reporte CHECK (
        (estado_reporte_anterior IS NULL AND estado_reporte_nuevo IS NULL)
        OR (estado_reporte_anterior IS NOT NULL AND estado_reporte_nuevo IS NOT NULL
            AND estado_reporte_anterior IN ('ABIERTO', 'EN_REVISION', 'RESUELTO', 'DESCARTADO')
            AND estado_reporte_nuevo IN ('ABIERTO', 'EN_REVISION', 'RESUELTO', 'DESCARTADO'))
    ),
    CONSTRAINT chk_audmod_forma CHECK (
        (accion IN ('APROBAR', 'RECHAZAR', 'ARCHIVAR', 'RESTAURAR', 'RESTAURAR_BAJA')
            AND reporte_id IS NULL AND estado_receta_anterior IS NOT NULL AND estado_receta_nuevo IS NOT NULL
            AND estado_reporte_anterior IS NULL AND estado_reporte_nuevo IS NULL)
        OR (accion IN ('REVISAR_REPORTE', 'RESOLVER_REPORTE', 'DESCARTAR_REPORTE')
            AND reporte_id IS NOT NULL AND estado_reporte_anterior IS NOT NULL AND estado_reporte_nuevo IS NOT NULL
            AND estado_receta_anterior IS NULL AND estado_receta_nuevo IS NULL)
    )
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE auditoria_administrativa (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_id BIGINT UNSIGNED NOT NULL,
    accion VARCHAR(30) COLLATE utf8mb4_0900_as_cs NOT NULL,
    usuario_afectado_id BIGINT UNSIGNED NULL,
    receta_afectada_id BIGINT UNSIGNED NULL,
    rol_id BIGINT UNSIGNED NULL,
    detalle VARCHAR(1000) NOT NULL,
    creado_en DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_audadm_actor (actor_id, creado_en, id),
    KEY idx_audadm_usuario (usuario_afectado_id, creado_en, id),
    KEY idx_audadm_receta (receta_afectada_id, creado_en, id),
    KEY idx_audadm_rol (rol_id, creado_en, id),
    CONSTRAINT fk_audadm_actor FOREIGN KEY (actor_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_audadm_usuario FOREIGN KEY (usuario_afectado_id) REFERENCES usuarios (id),
    CONSTRAINT fk_audadm_receta FOREIGN KEY (receta_afectada_id) REFERENCES recetas (id),
    CONSTRAINT fk_audadm_rol FOREIGN KEY (rol_id) REFERENCES roles (id),
    CONSTRAINT chk_audadm_accion CHECK (accion IN ('DESACTIVAR_CUENTA', 'REACTIVAR_CUENTA', 'BAJA_RECETA', 'RESTAURAR_RECETA', 'ASIGNAR_ROL', 'RETIRAR_ROL')),
    CONSTRAINT chk_audadm_forma CHECK (
        (accion IN ('DESACTIVAR_CUENTA', 'REACTIVAR_CUENTA')
            AND usuario_afectado_id IS NOT NULL AND receta_afectada_id IS NULL AND rol_id IS NULL)
        OR (accion IN ('BAJA_RECETA', 'RESTAURAR_RECETA')
            AND usuario_afectado_id IS NULL AND receta_afectada_id IS NOT NULL AND rol_id IS NULL)
        OR (accion IN ('ASIGNAR_ROL', 'RETIRAR_ROL')
            AND usuario_afectado_id IS NOT NULL AND receta_afectada_id IS NULL AND rol_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
