-- Ajuste de saldo para R$368,90
-- Saldo atual: -R$1.412,93
-- Diferença necessária: +R$1.781,83

INSERT INTO financeiro (empresa_id, tipo, descricao, valor, categoria, data, observacoes)
VALUES (
  (SELECT empresa_id FROM usuarios LIMIT 1),
  'entrada',
  'Saldo de abertura',
  1781.83,
  'Outros',
  '2026-08-01',
  'Ajuste inicial de caixa'
);
