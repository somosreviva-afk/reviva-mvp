-- AJUSTE 08: Tipo de cliente + tipo de pedido + embrulhos separados

-- Tipo no cadastro do cliente: venda | parceria | mimo
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'venda'
  CHECK (tipo IN ('venda', 'parceria', 'mimo'));

-- Tipo no pedido: venda | mimo
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'venda'
  CHECK (tipo IN ('venda', 'mimo'));

-- Embrulhos separados (para parcerias)
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS qtd_embrulhos integer NOT NULL DEFAULT 1;
