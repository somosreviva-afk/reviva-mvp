-- AJUSTE 19: Corrige custo do papel seda para R$0,08 por unidade

UPDATE configuracoes_materiais SET papel_seda_custo = 0.08;

UPDATE insumos SET custo_unitario = 0.08 WHERE tipo = 'papel_seda';

UPDATE lotes_estoque SET custo_unitario = 0.08
WHERE status = 'ativo'
  AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'papel_seda');
