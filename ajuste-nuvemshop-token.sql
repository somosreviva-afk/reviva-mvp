-- AJUSTE 24: Adiciona colunas para armazenar credenciais da Nuvemshop
ALTER TABLE configuracoes_materiais
ADD COLUMN IF NOT EXISTS nuvemshop_store_id TEXT,
ADD COLUMN IF NOT EXISTS nuvemshop_access_token TEXT;
