-- Sprint 6: CRM Clientes
-- Adiciona coluna estado à tabela clientes (cidade já existe no tipo)
-- Execute no Supabase SQL Editor

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade TEXT;

-- Confirmar
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clientes'
ORDER BY ordinal_position;
