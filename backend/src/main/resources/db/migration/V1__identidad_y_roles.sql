CREATE TABLE usuarios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    correo VARCHAR(254) NOT NULL,
    nombre_visible VARCHAR(100) NOT NULL,
    contrasena_hash VARCHAR(255) COLLATE utf8mb4_bin NOT NULL,
    biografia VARCHAR(1000) NULL,
    avatar_url VARCHAR(2048) NULL,
    version_tokens BIGINT UNSIGNED NOT NULL DEFAULT 0,
    creado_en DATETIME(6) NOT NULL,
    actualizado_en DATETIME(6) NOT NULL,
    eliminado_en DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(20) COLLATE utf8mb4_0900_as_cs NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_codigo (codigo),
    CONSTRAINT chk_roles_codigo CHECK (codigo IN ('ADMIN', 'MODERADOR', 'COCINERO', 'USUARIO'))
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE usuarios_roles (
    usuario_id BIGINT UNSIGNED NOT NULL,
    rol_id BIGINT UNSIGNED NOT NULL,
    asignado_en DATETIME(6) NOT NULL,
    PRIMARY KEY (usuario_id, rol_id),
    KEY idx_usuarios_roles_rol (rol_id, usuario_id),
    CONSTRAINT fk_usuarios_roles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_usuarios_roles_rol FOREIGN KEY (rol_id) REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
