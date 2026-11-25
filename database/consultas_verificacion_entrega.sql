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

-- Distribución general y de las recetas identificadas por la marca demo.
SELECT estado, COUNT(*) AS total FROM recetas GROUP BY estado ORDER BY estado;
SELECT estado, COUNT(*) AS total FROM recetas
WHERE descripcion LIKE '[DEMO-LOCAL-SO-2026:%' GROUP BY estado ORDER BY estado;

-- Recetas demo sin categorías o ingredientes: resultado esperado vacío en una carga nueva.
SELECT r.id, r.titulo,
       (SELECT COUNT(*) FROM recetas_categorias rc WHERE rc.receta_id=r.id) AS categorias,
       (SELECT COUNT(*) FROM recetas_ingredientes ri WHERE ri.receta_id=r.id) AS ingredientes
FROM recetas r
WHERE r.descripcion LIKE '[DEMO-LOCAL-SO-2026:%'
  AND (NOT EXISTS (SELECT 1 FROM recetas_categorias rc WHERE rc.receta_id=r.id)
       OR NOT EXISTS (SELECT 1 FROM recetas_ingredientes ri WHERE ri.receta_id=r.id));

-- Huérfanos en relaciones principales: todas las cantidades deben ser cero.
SELECT 'recetas_autor' AS relacion, COUNT(*) AS huerfanos FROM recetas r LEFT JOIN usuarios u ON u.id=r.autor_id WHERE u.id IS NULL
UNION ALL SELECT 'recetas_ingredientes_receta', COUNT(*) FROM recetas_ingredientes x LEFT JOIN recetas r ON r.id=x.receta_id WHERE r.id IS NULL
UNION ALL SELECT 'recetas_ingredientes_ingrediente', COUNT(*) FROM recetas_ingredientes x LEFT JOIN ingredientes i ON i.id=x.ingrediente_id WHERE i.id IS NULL
UNION ALL SELECT 'recetas_categorias_receta', COUNT(*) FROM recetas_categorias x LEFT JOIN recetas r ON r.id=x.receta_id WHERE r.id IS NULL
UNION ALL SELECT 'recetas_categorias_categoria', COUNT(*) FROM recetas_categorias x LEFT JOIN categorias c ON c.id=x.categoria_id WHERE c.id IS NULL
UNION ALL SELECT 'multimedia_receta', COUNT(*) FROM recetas_multimedia x LEFT JOIN recetas r ON r.id=x.receta_id WHERE r.id IS NULL
UNION ALL SELECT 'favoritos_usuario', COUNT(*) FROM favoritos x LEFT JOIN usuarios u ON u.id=x.usuario_id WHERE u.id IS NULL
UNION ALL SELECT 'favoritos_receta', COUNT(*) FROM favoritos x LEFT JOIN recetas r ON r.id=x.receta_id WHERE r.id IS NULL
UNION ALL SELECT 'reportes_usuario', COUNT(*) FROM reportes x LEFT JOIN usuarios u ON u.id=x.reportante_id WHERE u.id IS NULL
UNION ALL SELECT 'reportes_receta', COUNT(*) FROM reportes x LEFT JOIN recetas r ON r.id=x.receta_id WHERE r.id IS NULL;
