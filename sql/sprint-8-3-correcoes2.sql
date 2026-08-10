-- ────────────────────────────────────────────────────
-- SPRINT 8.3 — CORREÇÕES 2
-- ────────────────────────────────────────────────────

-- 1. Apagar entradas duplicadas criadas pelo auto-lançamento
DELETE FROM financeiro
WHERE observacoes LIKE 'Lançado automaticamente%';

-- 2. Limpar produtos quadro repetidos (manter só os 3 padrão)
UPDATE produtos SET ativo = false
WHERE nome ILIKE '%quadro%'
  AND nome NOT IN ('Kit Quadro + 4 Foto Ímã', 'Quadro', 'Quadro Fidelidade')
  AND empresa_id = (SELECT empresa_id FROM usuarios LIMIT 1);

-- 3. Ajuste de caixa para R$368,90
--    (roda DEPOIS dos steps 1 e 2 e de fazer o push do código)
--    Apaga qualquer ajuste anterior e insere o novo
DELETE FROM financeiro
WHERE descricao = 'Ajuste de caixa'
  AND empresa_id = (SELECT empresa_id FROM usuarios LIMIT 1);

-- INSTRUÇÃO: depois de rodar os steps 1 e 2 e abrir o caixa no app,
-- me manda o saldo que aparece. Aí coloco o valor certo aqui embaixo.
-- Por enquanto deixo comentado:
-- INSERT INTO financeiro (empresa_id, tipo, descricao, valor, categoria, data)
-- VALUES (
--   (SELECT empresa_id FROM usuarios LIMIT 1),
--   'saida',  -- ou 'entrada', depende do cálculo
--   'Ajuste de caixa',
--   0.00,     -- ← valor a definir
--   'Outros',
--   CURRENT_DATE
-- );
