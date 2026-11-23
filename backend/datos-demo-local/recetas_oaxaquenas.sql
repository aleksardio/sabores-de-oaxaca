-- Solo datos ficticios de desarrollo local; NO es una migración Flyway.
-- En la misma sesión mysql, elegir primero un usuario activo y ejecutar:
--   SET @demo_autor_id = <ID_DEL_AUTOR>;
--   SOURCE backend/datos-demo-local/recetas_oaxaquenas.sql;
-- Si no existe un autor activo con ese ID, no se inserta ningún dato.
-- No ejecutar simultáneamente varias copias del script.
SET NAMES utf8mb4;
SET @demo_autor_valido = (SELECT id FROM usuarios WHERE id = @demo_autor_id AND eliminado_en IS NULL);

-- Se identifican las recetas por una marca exclusiva en la descripción. Las
-- asociaciones se insertan únicamente para recetas creadas en esta ejecución:
-- una receta preexistente, incluso con la misma marca, nunca se modifica.
CREATE TEMPORARY TABLE IF NOT EXISTS demo_local_recetas_nuevas_so_2026 (
    ejecucion CHAR(36) NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    PRIMARY KEY (ejecucion, codigo),
    receta_id BIGINT UNSIGNED NOT NULL
);
SET @demo_ejecucion = UUID();
START TRANSACTION;

INSERT INTO categorias (nombre, descripcion)
SELECT d.nombre, d.descripcion FROM (
    SELECT 'Moles' AS nombre, 'Preparaciones de mole.' AS descripcion
    UNION ALL SELECT 'Antojitos', 'Antojitos tradicionales.'
) d
WHERE @demo_autor_valido IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM categorias c WHERE c.nombre = d.nombre);

INSERT INTO ingredientes (nombre, creado_en)
SELECT d.nombre, UTC_TIMESTAMP(6) FROM (
    SELECT 'Chile seco' AS nombre UNION ALL SELECT 'Chocolate de mesa'
    UNION ALL SELECT 'Ajonjolí' UNION ALL SELECT 'Sal'
    UNION ALL SELECT 'Tortilla de tlayuda' UNION ALL SELECT 'Frijoles cocidos'
    UNION ALL SELECT 'Quesillo' UNION ALL SELECT 'Masa de maíz'
    UNION ALL SELECT 'Salsa roja'
) d
WHERE @demo_autor_valido IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ingredientes i WHERE i.nombre = d.nombre);

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Mole negro oaxaqueño', '[DEMO-LOCAL-SO-2026:mole] Receta ficticia para pruebas locales.',
       'Tuesta los chiles y el ajonjolí. Muele y cocina con el chocolate. Ajusta la sal.',
       'TRADICIONAL_OAXAQUENA','PUBLICADA',4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion = '[DEMO-LOCAL-SO-2026:mole] Receta ficticia para pruebas locales.');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'mole', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Tlayuda oaxaqueña', '[DEMO-LOCAL-SO-2026:tlayuda] Receta ficticia para pruebas locales.',
       'Calienta las tortillas. Agrega frijoles y quesillo; sirve con salsa.',
       'TRADICIONAL_OAXAQUENA','PUBLICADA',4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion = '[DEMO-LOCAL-SO-2026:tlayuda] Receta ficticia para pruebas locales.');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'tlayuda', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Memelas oaxaqueñas', '[DEMO-LOCAL-SO-2026:memelas] Receta ficticia para pruebas locales.',
       'Forma memelas con la masa y cocínalas. Agrega frijoles, quesillo y salsa.',
       'TRADICIONAL_OAXAQUENA','PUBLICADA',4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion = '[DEMO-LOCAL-SO-2026:memelas] Receta ficticia para pruebas locales.');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'memelas', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Borrador de prueba oaxaqueño', '[DEMO-LOCAL-SO-2026:borrador] Receta ficticia para pruebas locales.',
       'Preparación ficticia sin publicar.',
       'TRADICIONAL_OAXAQUENA','BORRADOR',4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),NULL
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion = '[DEMO-LOCAL-SO-2026:borrador] Receta ficticia para pruebas locales.');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'borrador', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas_categorias (receta_id,categoria_id)
SELECT n.receta_id,c.id FROM demo_local_recetas_nuevas_so_2026 n
JOIN categorias c ON c.nombre = CASE WHEN n.codigo = 'mole' THEN 'Moles' ELSE 'Antojitos' END
WHERE n.ejecucion = @demo_ejecucion;

INSERT INTO recetas_ingredientes (receta_id,ingrediente_id,cantidad,unidad,orden,nota)
SELECT n.receta_id, i.id, d.cantidad, d.unidad, d.orden, d.nota
FROM demo_local_recetas_nuevas_so_2026 n
JOIN (
    SELECT 'mole' AS codigo, 'Chile seco' AS nombre, 100.000 AS cantidad, 'G' AS unidad, 1 AS orden, 'Sin semillas' AS nota
    UNION ALL SELECT 'mole','Chocolate de mesa',50.000,'G',2,NULL
    UNION ALL SELECT 'mole','Ajonjolí',20.000,'G',3,NULL
    UNION ALL SELECT 'mole','Sal',NULL,'AL_GUSTO',4,NULL
    UNION ALL SELECT 'tlayuda','Tortilla de tlayuda',4.000,'PIEZA',1,NULL
    UNION ALL SELECT 'tlayuda','Frijoles cocidos',400.000,'G',2,NULL
    UNION ALL SELECT 'tlayuda','Quesillo',200.000,'G',3,NULL
    UNION ALL SELECT 'tlayuda','Salsa roja',NULL,'AL_GUSTO',4,NULL
    UNION ALL SELECT 'memelas','Masa de maíz',400.000,'G',1,NULL
    UNION ALL SELECT 'memelas','Frijoles cocidos',200.000,'G',2,NULL
    UNION ALL SELECT 'memelas','Quesillo',100.000,'G',3,NULL
    UNION ALL SELECT 'memelas','Salsa roja',NULL,'AL_GUSTO',4,NULL
    UNION ALL SELECT 'borrador','Masa de maíz',100.000,'G',1,NULL
) d ON d.codigo = n.codigo JOIN ingredientes i ON i.nombre = d.nombre
WHERE n.ejecucion = @demo_ejecucion;

-- example.invalid está reservado; no son imágenes reales ni se espera que carguen.
INSERT INTO recetas_multimedia (receta_id,tipo,url,texto_alternativo,orden,creado_en)
SELECT n.receta_id, 'IMAGEN', CONCAT('https://example.invalid/demo-sabores-oaxaca/',n.codigo,'.jpg'),
       CONCAT('Referencia ficticia de ',n.codigo,'; imagen no disponible'), 1, UTC_TIMESTAMP(6)
FROM demo_local_recetas_nuevas_so_2026 n WHERE n.ejecucion = @demo_ejecucion AND n.codigo <> 'borrador';

COMMIT;
SELECT CASE WHEN @demo_autor_valido IS NULL THEN 'No se insertaron datos: seleccione un autor activo con @demo_autor_id.'
            ELSE 'Ejecución terminada. Las recetas preexistentes con estas marcas no se modificaron.' END AS resultado;
SELECT id,titulo,estado,autor_id FROM recetas
WHERE descripcion IN ('[DEMO-LOCAL-SO-2026:mole] Receta ficticia para pruebas locales.',
                      '[DEMO-LOCAL-SO-2026:tlayuda] Receta ficticia para pruebas locales.',
                      '[DEMO-LOCAL-SO-2026:memelas] Receta ficticia para pruebas locales.',
                      '[DEMO-LOCAL-SO-2026:borrador] Receta ficticia para pruebas locales.') ORDER BY id;
