-- ============================================================
-- Sprint 8.3 — Correções
-- Executar no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna pago na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pago boolean DEFAULT true;

-- Pedidos existentes já foram pagos (foram criados antes do controle)
UPDATE pedidos SET pago = true WHERE pago IS NULL AND tipo != 'mimo';
UPDATE pedidos SET pago = false WHERE tipo = 'mimo' AND pago IS NULL;

-- 2. Garantir que WhatsApp é opcional nos clientes
ALTER TABLE clientes ALTER COLUMN whatsapp DROP NOT NULL;

-- 3. Remover produtos kit misto (ímã + chaveiro juntos)
DELETE FROM produtos
WHERE (nome ILIKE '%misto%' OR nome ILIKE '%chaveiro%')
  AND empresa_id = (SELECT empresa_id FROM usuarios LIMIT 1);

-- 4. Adicionar produtos de Quadro
INSERT INTO produtos (empresa_id, nome, preco_venda, preco_liquido, qtd_imas, ativo)
SELECT
  empresa_id,
  nome,
  preco_venda,
  preco_liquido,
  qtd_imas,
  true
FROM (
  VALUES
    ('Kit Quadro + 4 Foto Ímã', 79.90, 79.90, 4),
    ('Quadro',                   44.90, 44.90, 0),
    ('Quadro Fidelidade',        34.90, 34.90, 0)
) AS novos(nome, preco_venda, preco_liquido, qtd_imas)
CROSS JOIN (SELECT empresa_id FROM usuarios LIMIT 1) AS emp
ON CONFLICT DO NOTHING;
