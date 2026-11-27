CREATE TABLE identidades_google (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT UNSIGNED NOT NULL,
    google_sub VARCHAR(255)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_bin NOT NULL,
    creado_en DATETIME(6) NOT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_google_sub (google_sub),
    UNIQUE KEY uq_google_usuario (usuario_id),

    CONSTRAINT fk_google_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
