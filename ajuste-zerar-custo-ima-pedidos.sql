-- AJUSTE 13: Remove custo do ímã dos pedidos já lançados
-- Os ímãs vieram com a máquina (já estão nos R$650 de investimento inicial)
-- Zera custo_imas, desconta do custo total e recalcula o lucro real

UPDATE pedidos
SET
  custo_total_pedido = custo_total_pedido - custo_imas,
  lucro_real         = lucro_real + custo_imas,
  custo_imas         = 0
WHERE custo_imas > 0;
