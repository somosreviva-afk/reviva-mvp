-- Adiciona forma de pagamento e valor recebido nos pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS forma_pagamento text DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS valor_recebido numeric(10,2);

-- Adiciona preço líquido (valor recebido via link de pagamento) nos produtos
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS preco_liquido numeric(10,2);

-- Preenche os valores líquidos dos kits existentes
UPDATE produtos SET preco_liquido = 65.64  WHERE nome LIKE '%Kit Amor%';
UPDATE produtos SET preco_liquido = 84.43  WHERE nome LIKE '%Kit Memórias%';
UPDATE produtos SET preco_liquido = 102.20 WHERE nome LIKE '%Kit Favorito%';
UPDATE produtos SET preco_liquido = 120.79 WHERE nome LIKE '%Kit Premium%';
