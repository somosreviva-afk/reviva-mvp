-- Atualiza estoque de argola e espelho
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  eid uuid;
BEGIN
  SELECT empresa_id INTO eid FROM usuarios LIMIT 1;

  UPDATE insumos SET quantidade = 100, updated_at = now()
  WHERE empresa_id = eid AND tipo = 'argola';

  UPDATE insumos SET quantidade = 50, updated_at = now()
  WHERE empresa_id = eid AND tipo = 'espelho';

  RAISE NOTICE 'Estoque atualizado: 100 argolas, 50 espelhos';
END $$;
