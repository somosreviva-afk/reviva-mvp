-- Cadastra produtos de chaveiro na tabela produtos
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  eid uuid;
BEGIN
  SELECT empresa_id INTO eid FROM usuarios LIMIT 1;
  DELETE FROM produtos WHERE empresa_id = eid AND nome ILIKE 'Chaveiro%';
  INSERT INTO produtos (empresa_id, nome, preco_venda, qtd_imas, ativo) VALUES
    (eid, 'Chaveiro 1 un',       14.90, 0, true),
    (eid, 'Chaveiro 3 un',       12.90, 0, true),
    (eid, 'Chaveiro 6 un',       11.50, 0, true),
    (eid, 'Chaveiro 8 un',       10.90, 0, true),
    (eid, 'Chaveiro 10 un',       9.90, 0, true),
    (eid, 'Chaveiro 11-30 un',    9.00, 0, true),
    (eid, 'Chaveiro 31-50 un',    8.50, 0, true),
    (eid, 'Chaveiro 51-100 un',   7.50, 0, true);
  RAISE NOTICE 'Produtos de chaveiro cadastrados para empresa %', eid;
END $$;
