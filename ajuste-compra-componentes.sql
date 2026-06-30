-- AJUSTE 16: Compra de 100 unidades de cada componente (sem ima_magnetico) por R$175,00 total
-- Custo por PEÇA = R$175 / 3 tipos / 100 unidades = R$0,5833 por peça
-- ima_custo = soma dos 4 componentes = 0 (ima_magnetico) + 0,5833 * 3 = R$1,75

-- 1. Fecha lotes antigos (custo R$0 — vinham com a máquina)
UPDATE lotes_estoque SET status = 'esgotado'
WHERE status = 'ativo'
  AND insumo_id IN (
    SELECT id FROM insumos
    WHERE tipo IN ('placa_plastico', 'placa_metal', 'plastico_protecao')
  );

-- 2. Adiciona 100 unidades e define custo por peça
UPDATE insumos SET
  quantidade     = quantidade + 100,
  custo_unitario = ROUND(175.0 / 3 / 100, 4)
WHERE tipo IN ('placa_plastico', 'placa_metal', 'plastico_protecao');

-- 3. Cria lote ativo para cada componente (cobre estoque antigo + 100 novas)
INSERT INTO lotes_estoque (empresa_id, insumo_id, quantidade_inicial, quantidade_restante, custo_unitario, status, data_compra, observacoes)
SELECT
  empresa_id,
  id,
  quantidade,
  quantidade,
  ROUND(175.0 / 3 / 100, 4),
  'ativo',
  CURRENT_DATE,
  'Compra 100 un cada (plástico + metal + proteção) — R$175,00 total'
FROM insumos
WHERE tipo IN ('placa_plastico', 'placa_metal', 'plastico_protecao');

-- 4. Atualiza ima_custo = soma dos 4 componentes
--    ima_magnetico = 0, outros 3 = 0,5833 cada → total = R$1,75 por ímã
UPDATE configuracoes_materiais
SET ima_custo = (
  SELECT COALESCE(SUM(custo_unitario), 0)
  FROM insumos
  WHERE tipo IN ('ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao')
    AND insumos.empresa_id = configuracoes_materiais.empresa_id
);
