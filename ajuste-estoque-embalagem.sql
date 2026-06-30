-- AJUSTE 15: Estoque real dos materiais de embalagem (contagem em casa)

UPDATE insumos SET quantidade = 100 WHERE tipo = 'envelope';
UPDATE insumos SET quantidade = 98  WHERE tipo = 'papel_seda';
UPDATE insumos SET quantidade = 91  WHERE tipo = 'caixa';
UPDATE insumos SET quantidade = 0   WHERE tipo = 'cartao';
-- saquinho e folha_impressao atualizados depois

-- Atualiza lotes ativos
UPDATE lotes_estoque SET quantidade_restante = 100
  WHERE status = 'ativo' AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'envelope');

UPDATE lotes_estoque SET quantidade_restante = 98
  WHERE status = 'ativo' AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'papel_seda');

UPDATE lotes_estoque SET quantidade_restante = 91
  WHERE status = 'ativo' AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'caixa');

UPDATE lotes_estoque SET quantidade_restante = 0, status = 'esgotado'
  WHERE status = 'ativo' AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'cartao');
