-- MySQL 8. Solo para un esquema aislado de prueba con V1–V9 aplicadas.
-- No ejecutar en producción. Respaldar y comprobar el destino antes de usar.
-- La colación del catálogo decide la igualdad de nombres; no crea asociaciones.
-- Inspeccionar el esquema de destino antes de importar. Ejecución secuencial.

SELECT DATABASE() AS esquema_actual;
SELECT COUNT(*) AS categorias_antes FROM categorias;
INSERT INTO categorias (nombre, descripcion)
SELECT candidato.nombre, candidato.descripcion
FROM (
    SELECT 'Desayunos' AS nombre, 'Preparaciones para la primera comida del día' AS descripcion
    UNION ALL SELECT 'Guisados', 'Preparaciones guisadas y platos de comida principal'
    UNION ALL SELECT 'Panadería tradicional', 'Panes y piezas horneadas tradicionales'
    UNION ALL SELECT 'Conservas y encurtidos', 'Alimentos preservados y encurtidos'
    UNION ALL SELECT 'Acompañamientos', 'Guarniciones que complementan un plato principal'
) AS candidato
WHERE NOT EXISTS (SELECT 1 FROM categorias existente WHERE existente.nombre = candidato.nombre);

-- INGREDIENTES OPCIONALES: bloque DESACTIVADO intencionalmente.
-- Los 40 ingredientes actuales ya cumplen el mínimo de la asignación.
-- Para habilitar este bloque, retirar /* y */ tras probar en una base aislada.
/*
INSERT INTO ingredientes (nombre, creado_en)
SELECT candidato.nombre, CURRENT_TIMESTAMP(6)
FROM (
    SELECT 'Chile chilhuacle negro' AS nombre
    UNION ALL SELECT 'Chile chilhuacle rojo'
    UNION ALL SELECT 'Chile chilhuacle amarillo'
    UNION ALL SELECT 'Chile pasilla oaxaqueño'
    UNION ALL SELECT 'Chile costeño'
    UNION ALL SELECT 'Chile de árbol'
    UNION ALL SELECT 'Chile guajillo'
    UNION ALL SELECT 'Chile ancho'
    UNION ALL SELECT 'Chile mulato'
    UNION ALL SELECT 'Chile chipotle seco'
    UNION ALL SELECT 'Chile serrano'
    UNION ALL SELECT 'Chile poblano'
    UNION ALL SELECT 'Maíz criollo'
    UNION ALL SELECT 'Masa de maíz nixtamalizado'
    UNION ALL SELECT 'Hoja de maíz'
    UNION ALL SELECT 'Hoja de plátano'
    UNION ALL SELECT 'Frijol negro'
    UNION ALL SELECT 'Frijol bayo'
    UNION ALL SELECT 'Frijol ayocote'
    UNION ALL SELECT 'Haba seca'
    UNION ALL SELECT 'Garbanzo'
    UNION ALL SELECT 'Flor de calabaza'
    UNION ALL SELECT 'Calabacita'
    UNION ALL SELECT 'Chayote'
    UNION ALL SELECT 'Guías de calabaza'
    UNION ALL SELECT 'Ejote'
    UNION ALL SELECT 'Nopal'
    UNION ALL SELECT 'Verdolaga'
    UNION ALL SELECT 'Quelites'
    UNION ALL SELECT 'Huauzontle'
    UNION ALL SELECT 'Hoja santa'
    UNION ALL SELECT 'Epazote'
    UNION ALL SELECT 'Pitiona'
    UNION ALL SELECT 'Chepil'
    UNION ALL SELECT 'Cilantro'
    UNION ALL SELECT 'Perejil'
    UNION ALL SELECT 'Orégano mexicano'
    UNION ALL SELECT 'Tomillo'
    UNION ALL SELECT 'Mejorana'
    UNION ALL SELECT 'Ajonjolí'
    UNION ALL SELECT 'Pepita de calabaza'
    UNION ALL SELECT 'Cacahuate'
    UNION ALL SELECT 'Almendra'
    UNION ALL SELECT 'Nuez de Castilla'
    UNION ALL SELECT 'Cacao'
    UNION ALL SELECT 'Canela'
    UNION ALL SELECT 'Clavo de olor'
    UNION ALL SELECT 'Pimienta gorda'
    UNION ALL SELECT 'Comino'
    UNION ALL SELECT 'Anís'
    UNION ALL SELECT 'Piloncillo'
    UNION ALL SELECT 'Chocolate de metate'
    UNION ALL SELECT 'Pan de yema'
    UNION ALL SELECT 'Totopo istmeño'
    UNION ALL SELECT 'Quesillo'
    UNION ALL SELECT 'Queso fresco'
    UNION ALL SELECT 'Tasajo'
    UNION ALL SELECT 'Cecina enchilada'
    UNION ALL SELECT 'Chapulines'
    UNION ALL SELECT 'Hongos silvestres comestibles'
    UNION ALL SELECT 'Tomate verde'
    UNION ALL SELECT 'Jitomate'
    UNION ALL SELECT 'Aguacate'
    UNION ALL SELECT 'Piña'
    UNION ALL SELECT 'Tamarindo'
    UNION ALL SELECT 'Flor de jamaica'
    UNION ALL SELECT 'Achiote'
    UNION ALL SELECT 'Manteca de cerdo'
    UNION ALL SELECT 'Naranja agria'
    UNION ALL SELECT 'Coco rallado'
) AS candidato
WHERE NOT EXISTS (SELECT 1 FROM ingredientes existente WHERE existente.nombre = candidato.nombre);
*/

SELECT COUNT(*) AS categorias_despues FROM categorias;
SELECT COUNT(*) AS ingredientes_sin_cambios FROM ingredientes;
