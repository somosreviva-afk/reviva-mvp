-- AJUSTE 14: Estoque real dos componentes do ímã (contagem em casa)

-- Atualiza quantidade nos insumos
UPDATE insumos SET quantidade = 0  WHERE tipo = 'ima_magnetico';
UPDATE insumos SET quantidade = 28 WHERE tipo = 'placa_plastico';
UPDATE insumos SET quantidade = 19 WHERE tipo = 'placa_metal';
UPDATE insumos SET quantidade = 23 WHERE tipo = 'plastico_protecao';

-- Atualiza lote ativo de cada componente
UPDATE lotes_estoque SET quantidade_restante = 0,  status = 'esgotado'
  WHERE status = 'ativo' AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'ima_magnetico');

UPDATE lotes_estoque SET quantidade_restante = 28
  WHERE status = 'ativo' AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'placa_plastico');

UPDATE lotes_estoque SET quantidade_restante = 19
  WHERE status = 'ativo' AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'placa_metal');

UPDATE lotes_estoque SET quantidade_restante = 23
  WHERE status = 'ativo' AND insumo_id = (SELECT id FROM insumos WHERE tipo = 'plastico_protecao');
