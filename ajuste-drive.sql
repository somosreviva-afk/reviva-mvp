-- Adiciona colunas de Google Drive nos pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS link_pasta_drive text,
  ADD COLUMN IF NOT EXISTS pasta_drive_id text;

-- O status 'aguardando_fotos' e 'enviado' são apenas valores de texto,
-- nenhuma alteração de schema necessária (coluna status já é text)
