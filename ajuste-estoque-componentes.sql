-- AJUSTE 10: Separar ímã em 4 componentes no estoque
-- Migra o antigo insumo 'ima' para 'ima_magnetico'
-- Os outros 3 componentes serão criados pelo garantirInsumos() ao acessar a página de estoque

-- 1. Atualiza o insumo existente 'ima' → 'ima_magnetico'
UPDATE insumos
SET tipo = 'ima_magnetico', nome = 'Ímã Magnético'
WHERE tipo = 'ima';

-- 2. Cria os outros 3 componentes (mesma empresa, quantidade 0 — você lança o que tiver em casa)
INSERT INTO insumos (empresa_id, tipo, nome, unidade, quantidade, estoque_minimo)
SELECT
  empresa_id,
  unnest(ARRAY['placa_plastico', 'placa_metal', 'plastico_protecao']) AS tipo,
  unnest(ARRAY['Placa de Plástico', 'Placa de Metal', 'Plástico de Proteção']) AS nome,
  'unidade' AS unidade,
  0 AS quantidade,
  50 AS estoque_minimo
FROM insumos
WHERE tipo = 'ima_magnetico'
ON CONFLICT DO NOTHING;
