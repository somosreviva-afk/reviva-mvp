-- Adicionar campos de frete na tabela pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS frete_valor    numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transportadora text,
  ADD COLUMN IF NOT EXISTS prazo_entrega  text,
  ADD COLUMN IF NOT EXISTS codigo_rastreio text;

-- Conferir
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'pedidos' AND column_name IN ('frete_valor','transportadora','prazo_entrega','codigo_rastreio');
