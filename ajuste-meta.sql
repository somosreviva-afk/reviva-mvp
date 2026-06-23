-- AJUSTE 09: Meta de recuperação do investimento inicial
ALTER TABLE configuracoes_materiais
  ADD COLUMN IF NOT EXISTS investimento_inicial numeric(10,2) DEFAULT 0;

-- Define o investimento inicial da Reviva
UPDATE configuracoes_materiais SET investimento_inicial = 650.00;
