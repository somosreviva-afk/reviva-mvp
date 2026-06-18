-- AJUSTE 05 - Envio e Rastreamento
-- Adiciona coluna de data de postagem
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS data_postagem date;
