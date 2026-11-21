CREATE TABLE recuperaciones_contrasena (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL,
    creado_en DATETIME(6) NOT NULL,
    expira_en DATETIME(6) NOT NULL,
    usado_en DATETIME(6) NULL,
    invalidado_en DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_recuperaciones_token_hash (token_hash),
    KEY idx_recuperaciones_usuario (usuario_id, expira_en),
    CONSTRAINT fk_recuperaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_recuperaciones_expiracion CHECK (expira_en > creado_en)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
