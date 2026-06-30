-- AJUSTE 20: Zera valor_pago nas movimentacoes_estoque antigas
-- Essas entradas eram do estoque inicial (veio com a máquina / R$200 do investimento)
-- O R$175 da compra nova vai ser registrado corretamente pelo app

UPDATE movimentacoes_estoque
SET valor_pago = NULL, custo_unitario = NULL
WHERE tipo = 'entrada'
  AND data < CURRENT_DATE;  -- tudo antes de hoje = era estoque inicial
