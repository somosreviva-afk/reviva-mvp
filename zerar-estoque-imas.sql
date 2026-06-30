-- ============================================================
-- RESET ESTOQUE COMPONENTES DO ÍMÃ
-- Executa no Supabase → SQL Editor
-- ============================================================

-- 1. Zera quantidade dos 4 componentes
UPDATE insumos
SET quantidade = 0, updated_at = now()
WHERE tipo IN ('ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao');

-- 2. Remove todos os lotes desses componentes
DELETE FROM lotes_estoque
WHERE insumo_id IN (
  SELECT id FROM insumos
  WHERE tipo IN ('ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao')
);

-- 3. Remove todas as movimentacoes desses componentes
DELETE FROM movimentacoes_estoque
WHERE insumo_id IN (
  SELECT id FROM insumos
  WHERE tipo IN ('ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao')
);

-- 4. Confirma resultado (deve mostrar 0 em todos)
SELECT tipo, nome, ROUND(quantidade::numeric, 0) AS quantidade
FROM insumos
WHERE tipo IN ('ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao')
ORDER BY tipo;
