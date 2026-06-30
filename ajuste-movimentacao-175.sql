-- AJUSTE 22: Registra saída de caixa dos R$175 gastos com componentes
-- (a entrada de estoque foi feita via SQL, mas a movimentação financeira não foi registrada)

INSERT INTO movimentacoes_estoque (
  empresa_id, insumo_id, tipo, quantidade, valor_pago, custo_unitario, observacoes, data
)
SELECT
  empresa_id,
  id,
  'entrada',
  100,
  175.00,
  ROUND(175.0 / 3 / 100, 4),
  'Compra 100 un cada (plástico + metal + proteção) — R$175,00 total',
  CURRENT_DATE
FROM insumos
WHERE tipo = 'placa_plastico';
