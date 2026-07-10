-- Cadastra produtos de chaveiro avulso (sem e com espelho)
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  eid uuid;
BEGIN
  SELECT empresa_id INTO eid FROM usuarios LIMIT 1;
  DELETE FROM produtos WHERE empresa_id = eid AND nome ILIKE 'Chaveiro%';

  -- Sem espelho
  INSERT INTO produtos (empresa_id, nome, preco_venda, qtd_imas, ativo) VALUES
    (eid, 'Chaveiro sem espelho 1 un',     13.90, 0, true),
    (eid, 'Chaveiro sem espelho 5+ un',    11.50, 0, true),
    (eid, 'Chaveiro sem espelho 10+ un',   10.50, 0, true),
    (eid, 'Chaveiro sem espelho 15+ un',    9.50, 0, true);

  -- Com espelho
  INSERT INTO produtos (empresa_id, nome, preco_venda, qtd_imas, ativo) VALUES
    (eid, 'Chaveiro com espelho 1 un',     14.90, 0, true),
    (eid, 'Chaveiro com espelho 5+ un',    12.50, 0, true),
    (eid, 'Chaveiro com espelho 10+ un',   11.50, 0, true),
    (eid, 'Chaveiro com espelho 15+ un',   10.50, 0, true);

  RAISE NOTICE 'Produtos de chaveiro cadastrados para empresa %', eid;
END $$;
