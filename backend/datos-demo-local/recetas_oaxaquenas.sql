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
    UNION ALL SELECT 'Antojitos', 'Preparaciones de masa y antojitos.'
    UNION ALL SELECT 'Sopas y guisos', 'Sopas y guisos caseros.'
    UNION ALL SELECT 'Bebidas', 'Bebidas calientes.'
    UNION ALL SELECT 'Acompañamientos', 'Salsas y acompañamientos.'
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
    UNION ALL SELECT 'Jitomate' UNION ALL SELECT 'Cebolla' UNION ALL SELECT 'Ajo'
    UNION ALL SELECT 'Chile verde' UNION ALL SELECT 'Calabacita' UNION ALL SELECT 'Flor de calabaza'
    UNION ALL SELECT 'Epazote' UNION ALL SELECT 'Huevo' UNION ALL SELECT 'Aceite vegetal'
    UNION ALL SELECT 'Arroz' UNION ALL SELECT 'Caldo de verduras' UNION ALL SELECT 'Pollo cocido'
    UNION ALL SELECT 'Hoja de plátano' UNION ALL SELECT 'Elote' UNION ALL SELECT 'Leche'
    UNION ALL SELECT 'Azúcar' UNION ALL SELECT 'Canela' UNION ALL SELECT 'Agua'
) d
WHERE @demo_autor_valido IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM ingredientes i WHERE i.nombre = d.nombre);

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Mole negro oaxaqueño', '[DEMO-LOCAL-SO-2026:mole] Mole de chiles secos con chocolate y ajonjolí.',
       'Limpia y tuesta los chiles y el ajonjolí. Remoja los chiles en agua caliente y muélelos con el ajonjolí. Cocina la salsa a fuego bajo, incorpora el chocolate hasta disolver y ajusta la sal.',
       'TRADICIONAL_OAXAQUENA','PUBLICADA',4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:mole]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'mole', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Tlayuda oaxaqueña', '[DEMO-LOCAL-SO-2026:tlayuda] Tortilla grande con frijoles, quesillo y salsa.',
       'Calienta las tortillas en comal. Extiende los frijoles, añade el quesillo deshebrado y calienta hasta que se funda. Dobla si lo deseas y sirve con salsa.',
       'TRADICIONAL_OAXAQUENA','PUBLICADA',4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:tlayuda]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'tlayuda', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Memelas oaxaqueñas', '[DEMO-LOCAL-SO-2026:memelas] Memelas de maíz con frijoles, quesillo y salsa.',
       'Divide la masa y forma discos gruesos. Cocina en comal por ambos lados y pellizca los bordes. Agrega frijoles y quesillo, calienta hasta fundir y sirve con salsa.',
       'TRADICIONAL_OAXAQUENA','PUBLICADA',4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:memelas]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'memelas', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Empanadas de quesillo', '[DEMO-LOCAL-SO-2026:borrador] Empanadas de masa rellenas de quesillo y salsa.',
       'Amasa con agua hasta obtener una masa suave. Forma discos, rellena con quesillo y ciérralos. Cocina en comal por ambos lados y sirve con salsa.',
       'TRADICIONAL_OAXAQUENA','BORRADOR',4,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),NULL
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:borrador]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'borrador', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Sopa de calabacita y elote', '[DEMO-LOCAL-SO-2026:sopa_guia] Sopa de verduras con calabacita, elote y epazote.',
       'Sofríe cebolla y ajo en aceite. Añade calabacita y granos de elote, cubre con caldo y cocina hasta que están tiernos. Agrega epazote y sal antes de servir.', 'COMUN', 'BORRADOR', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), NULL
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE LEFT(descripcion, CHAR_LENGTH('[DEMO-LOCAL-SO-2026:sopa_guia]')) = '[DEMO-LOCAL-SO-2026:sopa_guia]');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'sopa_guia', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Tamales en hoja de plátano', '[DEMO-LOCAL-SO-2026:tamales] Tamales de masa con pollo y salsa roja.',
       'Suaviza las hojas de plátano al calor y córtalas en cuadros. Extiende masa, añade pollo y salsa, envuelve y cocina al vapor hasta que la masa se desprenda de la hoja.', 'TRADICIONAL_OAXAQUENA', 'PUBLICADA', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:tamales]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'tamales', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Quesadillas de flor de calabaza', '[DEMO-LOCAL-SO-2026:quesadillas] Quesadillas de comal con flor de calabaza y quesillo.',
       'Limpia la flor y saltéala con cebolla y epazote. Forma tortillas con la masa, agrega quesillo y el relleno; dobla y cocina en comal hasta dorar.', 'TRADICIONAL_OAXAQUENA', 'PUBLICADA', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:quesadillas]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'quesadillas', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Salsa roja asada', '[DEMO-LOCAL-SO-2026:salsa] Salsa de jitomate, chile y ajo para acompañar antojitos.',
       'Asa jitomates, chile y ajo en comal hasta que están suaves. Muele con cebolla y sal; incorpora un poco de agua si necesitas una salsa más ligera.', 'COMUN', 'PUBLICADA', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:salsa]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'salsa', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Arroz rojo casero', '[DEMO-LOCAL-SO-2026:arroz] Arroz cocido con jitomate y caldo de verduras.',
       'Licúa jitomate con cebolla y ajo. Sofríe el arroz en aceite, agrega la salsa y el caldo caliente; tapa y cocina a fuego bajo hasta absorber el líquido.', 'COMUN', 'PUBLICADA', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:arroz]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'arroz', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Huevos con salsa roja', '[DEMO-LOCAL-SO-2026:huevos] Huevos cocinados y servidos con salsa de jitomate.',
       'Calienta el aceite en una sartén y cocina los huevos al punto deseado. Calienta aparte la salsa roja y sírvela sobre los huevos. Acompaña con frijoles.', 'COMUN', 'PUBLICADA', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:huevos]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'huevos', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Atole de masa y canela', '[DEMO-LOCAL-SO-2026:atole] Bebida caliente de maíz con canela.',
       'Disuelve la masa en agua fría y cuélala. Calienta el resto del agua con canela, incorpora la masa y cocina a fuego bajo moviendo hasta espesar. Endulza al gusto.', 'TRADICIONAL_OAXAQUENA', 'PUBLICADA', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:atole]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'atole', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Chocolate de mesa espumoso', '[DEMO-LOCAL-SO-2026:chocolate] Bebida caliente de chocolate de mesa con leche.',
       'Calienta la leche sin dejar que hierva. Agrega el chocolate picado y mueve hasta disolver; bate con molinillo o batidor hasta obtener espuma y sirve caliente.', 'TRADICIONAL_OAXAQUENA', 'PUBLICADA', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:chocolate]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'chocolate', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas (autor_id,titulo,descripcion,preparacion,tipo,estado,porciones_base,creado_en,actualizado_en,publicado_en)
SELECT @demo_autor_valido, 'Calabacitas con elote y quesillo', '[DEMO-LOCAL-SO-2026:calabacitas] Guiso sencillo de calabacitas con granos de elote.',
       'Sofríe cebolla y ajo. Incorpora calabacitas y elote, cocina tapado con un poco de agua hasta ablandar y termina con quesillo deshebrado y sal.', 'COMUN', 'PUBLICADA', 4, UTC_TIMESTAMP(6), UTC_TIMESTAMP(6), UTC_TIMESTAMP(6)
WHERE @demo_autor_valido IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM recetas WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:calabacitas]%');
INSERT INTO demo_local_recetas_nuevas_so_2026 (ejecucion,codigo,receta_id) SELECT @demo_ejecucion, 'calabacitas', LAST_INSERT_ID() WHERE ROW_COUNT() = 1;

INSERT INTO recetas_categorias (receta_id,categoria_id)
SELECT n.receta_id,c.id FROM demo_local_recetas_nuevas_so_2026 n
JOIN categorias c ON c.nombre = CASE WHEN n.codigo = 'mole' THEN 'Moles' WHEN n.codigo IN ('sopa_guia','calabacitas','huevos') THEN 'Sopas y guisos' WHEN n.codigo IN ('atole','chocolate') THEN 'Bebidas' WHEN n.codigo IN ('salsa','arroz') THEN 'Acompañamientos' ELSE 'Antojitos' END
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
    UNION ALL SELECT 'borrador','Masa de maíz',600.000,'G',1,NULL
    UNION ALL SELECT 'borrador','Quesillo',200.000,'G',2,NULL
    UNION ALL SELECT 'borrador','Salsa roja',NULL,'AL_GUSTO',3,NULL
    UNION ALL SELECT 'borrador','Agua',100.000,'ML',4,NULL
    UNION ALL SELECT 'sopa_guia','Calabacita',400.000,'G',1,NULL
    UNION ALL SELECT 'sopa_guia','Elote',2.000,'PIEZA',2,NULL
    UNION ALL SELECT 'sopa_guia','Cebolla',100.000,'G',3,NULL
    UNION ALL SELECT 'sopa_guia','Ajo',1.000,'PIEZA',4,NULL
    UNION ALL SELECT 'sopa_guia','Caldo de verduras',1000.000,'ML',5,NULL
    UNION ALL SELECT 'sopa_guia','Epazote',10.000,'G',6,NULL
    UNION ALL SELECT 'sopa_guia','Aceite vegetal',1.000,'CUCHARADA',7,NULL
    UNION ALL SELECT 'sopa_guia','Sal',NULL,'AL_GUSTO',8,NULL
    UNION ALL SELECT 'tamales','Masa de maíz',800.000,'G',1,NULL
    UNION ALL SELECT 'tamales','Pollo cocido',400.000,'G',2,NULL
    UNION ALL SELECT 'tamales','Salsa roja',200.000,'G',3,NULL
    UNION ALL SELECT 'tamales','Hoja de plátano',4.000,'PIEZA',4,NULL
    UNION ALL SELECT 'tamales','Sal',NULL,'AL_GUSTO',5,NULL
    UNION ALL SELECT 'quesadillas','Masa de maíz',600.000,'G',1,NULL
    UNION ALL SELECT 'quesadillas','Flor de calabaza',200.000,'G',2,NULL
    UNION ALL SELECT 'quesadillas','Quesillo',200.000,'G',3,NULL
    UNION ALL SELECT 'quesadillas','Cebolla',50.000,'G',4,NULL
    UNION ALL SELECT 'quesadillas','Epazote',5.000,'G',5,NULL
    UNION ALL SELECT 'quesadillas','Aceite vegetal',1.000,'CUCHARADA',6,NULL
    UNION ALL SELECT 'salsa','Jitomate',500.000,'G',1,NULL
    UNION ALL SELECT 'salsa','Chile verde',2.000,'PIEZA',2,NULL
    UNION ALL SELECT 'salsa','Ajo',1.000,'PIEZA',3,NULL
    UNION ALL SELECT 'salsa','Cebolla',50.000,'G',4,NULL
    UNION ALL SELECT 'salsa','Agua',50.000,'ML',5,NULL
    UNION ALL SELECT 'salsa','Sal',NULL,'AL_GUSTO',6,NULL
    UNION ALL SELECT 'arroz','Arroz',300.000,'G',1,NULL
    UNION ALL SELECT 'arroz','Jitomate',200.000,'G',2,NULL
    UNION ALL SELECT 'arroz','Cebolla',50.000,'G',3,NULL
    UNION ALL SELECT 'arroz','Ajo',1.000,'PIEZA',4,NULL
    UNION ALL SELECT 'arroz','Caldo de verduras',600.000,'ML',5,NULL
    UNION ALL SELECT 'arroz','Aceite vegetal',1.000,'CUCHARADA',6,NULL
    UNION ALL SELECT 'arroz','Sal',NULL,'AL_GUSTO',7,NULL
    UNION ALL SELECT 'huevos','Huevo',8.000,'PIEZA',1,NULL
    UNION ALL SELECT 'huevos','Salsa roja',250.000,'G',2,NULL
    UNION ALL SELECT 'huevos','Frijoles cocidos',300.000,'G',3,NULL
    UNION ALL SELECT 'huevos','Aceite vegetal',1.000,'CUCHARADA',4,NULL
    UNION ALL SELECT 'atole','Masa de maíz',150.000,'G',1,NULL
    UNION ALL SELECT 'atole','Agua',1000.000,'ML',2,NULL
    UNION ALL SELECT 'atole','Canela',1.000,'PIEZA',3,NULL
    UNION ALL SELECT 'atole','Azúcar',40.000,'G',4,NULL
    UNION ALL SELECT 'chocolate','Chocolate de mesa',100.000,'G',1,NULL
    UNION ALL SELECT 'chocolate','Leche',1000.000,'ML',2,NULL
    UNION ALL SELECT 'calabacitas','Calabacita',600.000,'G',1,NULL
    UNION ALL SELECT 'calabacitas','Elote',2.000,'PIEZA',2,NULL
    UNION ALL SELECT 'calabacitas','Quesillo',150.000,'G',3,NULL
    UNION ALL SELECT 'calabacitas','Cebolla',80.000,'G',4,NULL
    UNION ALL SELECT 'calabacitas','Ajo',1.000,'PIEZA',5,NULL
    UNION ALL SELECT 'calabacitas','Aceite vegetal',1.000,'CUCHARADA',6,NULL
    UNION ALL SELECT 'calabacitas','Agua',100.000,'ML',7,NULL
    UNION ALL SELECT 'calabacitas','Sal',NULL,'AL_GUSTO',8,NULL
) d ON d.codigo = n.codigo JOIN ingredientes i ON i.nombre = d.nombre
WHERE n.ejecucion = @demo_ejecucion;

-- example.invalid está reservado; no son imágenes reales ni se espera que carguen.
INSERT INTO recetas_multimedia (receta_id,tipo,url,texto_alternativo,orden,creado_en)
SELECT n.receta_id, 'IMAGEN', CONCAT('https://example.invalid/demo-sabores-oaxaca/',n.codigo,'.jpg'),
       CONCAT('Referencia ficticia de ',n.codigo,'; imagen no disponible'), 1, UTC_TIMESTAMP(6)
FROM demo_local_recetas_nuevas_so_2026 n WHERE n.ejecucion = @demo_ejecucion AND n.codigo <> 'borrador';

COMMIT;
SELECT n.codigo,n.receta_id AS id_creado,r.titulo FROM demo_local_recetas_nuevas_so_2026 n JOIN recetas r ON r.id=n.receta_id WHERE n.ejecucion=@demo_ejecucion ORDER BY n.codigo;
SELECT CASE WHEN @demo_autor_valido IS NULL THEN 'No se insertaron datos: seleccione un autor activo con @demo_autor_id.'
            ELSE 'Ejecución terminada. Las recetas preexistentes con estas marcas no se modificaron.' END AS resultado;
SELECT id,titulo,estado,autor_id FROM recetas
WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:%' ORDER BY id;
