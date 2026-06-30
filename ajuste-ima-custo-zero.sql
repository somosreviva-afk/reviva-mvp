-- AJUSTE 12: Zera custo do ímã enquanto usa o estoque inicial (veio com a máquina)
-- Quando comprar o próximo lote e o estoque inicial acabar, o sistema atualiza automaticamente

-- Zera custo em configuracoes_materiais
UPDATE configuracoes_materiais SET ima_custo = 0;

-- Zera custo_unitario nos insumos dos 4 componentes
UPDATE insumos
SET custo_unitario = 0
WHERE tipo IN ('ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao');

-- Zera custo_unitario no lote ativo atual dos componentes
UPDATE lotes_estoque
SET custo_unitario = 0
WHERE status = 'ativo'
  AND insumo_id IN (
    SELECT id FROM insumos
    WHERE tipo IN ('ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao')
  );
