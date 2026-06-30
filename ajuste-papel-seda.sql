-- AJUSTE 17: Papel seda agora rastreado em unidades individuais (1 unidade = 1 caixinha)
-- 1 folha rende 4 caixinhas → 98 folhas × 4 = 392 unidades

UPDATE insumos SET
  quantidade = 392,
  unidade = 'unidade',
  estoque_minimo = 40
WHERE tipo = 'papel_seda';

UPDATE lotes_estoque SET quantidade_restante = 392
WHERE status = 'ativo'
  AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'papel_seda');
