-- AJUSTE 23: Adiciona coluna nuvemshop_order_id na tabela pedidos
-- Permite identificar pedidos vindos da Nuvemshop e evitar duplicatas

ALTER TABLE pedidos
ADD COLUMN IF NOT EXISTS nuvemshop_order_id TEXT;

-- Índice único para evitar pedido duplicado do mesmo número Nuvemshop
CREATE UNIQUE INDEX IF NOT EXISTS pedidos_nuvemshop_order_id_unique
ON pedidos (empresa_id, nuvemshop_order_id)
WHERE nuvemshop_order_id IS NOT NULL;
