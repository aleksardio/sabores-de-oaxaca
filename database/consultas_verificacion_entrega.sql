-- Solo consultas de lectura para una base de desarrollo autorizada; no modifica datos.
-- Usar la base seleccionada expresamente y comparar contra el enunciado oficial.
SELECT DATABASE() AS esquema_seleccionado;
SELECT 'usuarios' AS entidad, COUNT(*) AS total FROM usuarios
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'categorias', COUNT(*) FROM categorias
UNION ALL SELECT 'ingredientes', COUNT(*) FROM ingredientes
UNION ALL SELECT 'recetas', COUNT(*) FROM recetas
UNION ALL SELECT 'recetas publicadas activas', COUNT(*) FROM recetas WHERE estado='PUBLICADA' AND eliminado_en IS NULL
UNION ALL SELECT 'recetas_ingredientes', COUNT(*) FROM recetas_ingredientes
UNION ALL SELECT 'recetas_categorias', COUNT(*) FROM recetas_categorias
UNION ALL SELECT 'recetas_multimedia', COUNT(*) FROM recetas_multimedia
UNION ALL SELECT 'favoritos', COUNT(*) FROM favoritos
UNION ALL SELECT 'reportes', COUNT(*) FROM reportes;
