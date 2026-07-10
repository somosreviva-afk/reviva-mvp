-- Cadastra produtos de chaveiro (sem e com espelho) na tabela produtos
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  eid uuid;
BEGIN
  SELECT empresa_id INTO eid FROM usuarios LIMIT 1;
  DELETE FROM produtos WHERE empresa_id = eid AND nome ILIKE 'Chaveiro%';

  -- Sem espelho
  INSERT INTO produtos (empresa_id, nome, preco_venda, qtd_imas, ativo) VALUES
    (eid, 'Chaveiro sem espelho 1 un',       13.90, 0, true),
    (eid, 'Chaveiro sem espelho 3 un',        11.90, 0, true),
    (eid, 'Chaveiro sem espelho 6 un',        10.90, 0, true),
    (eid, 'Chaveiro sem espelho 8 un',        10.50, 0, true),
    (eid, 'Chaveiro sem espelho 10 un',        9.50, 0, true),
    (eid, 'Chaveiro sem espelho 11-30 un',     8.90, 0, true),
    (eid, 'Chaveiro sem espelho 31-50 un',     8.50, 0, true),
    (eid, 'Chaveiro sem espelho 51-100 un',    7.50, 0, true);

  -- Com espelho
  INSERT INTO produtos (empresa_id, nome, preco_venda, qtd_imas, ativo) VALUES
    (eid, 'Chaveiro com espelho 1 un',        14.90, 0, true),
    (eid, 'Chaveiro com espelho 3 un',         12.90, 0, true),
    (eid, 'Chaveiro com espelho 6 un',         11.50, 0, true),
    (eid, 'Chaveiro com espelho 8 un',         10.90, 0, true),
    (eid, 'Chaveiro com espelho 10 un',         9.90, 0, true),
    (eid, 'Chaveiro com espelho 11-30 un',      9.00, 0, true),
    (eid, 'Chaveiro com espelho 31-50 un',      8.50, 0, true),
    (eid, 'Chaveiro com espelho 51-100 un',     7.50, 0, true);

  RAISE NOTICE 'Produtos de chaveiro cadastrados para empresa %', eid;
END $$;
