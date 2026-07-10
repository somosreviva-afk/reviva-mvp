-- Cria produtos "Kit Misto" com mesmo preço dos kits de ímã equivalentes
-- Execute no Supabase SQL Editor

DO $$
DECLARE
  eid uuid;
  r record;
  total_imas int;
  nome_misto text;
BEGIN
  SELECT empresa_id INTO eid FROM usuarios LIMIT 1;

  -- Remove kits mistos antigos se existirem
  DELETE FROM produtos WHERE empresa_id = eid AND nome ILIKE '%Misto%';

  -- Para cada kit de ímã com 4+ ímãs, cria versão misto (sem/com espelho)
  FOR r IN
    SELECT nome, preco_venda, qtd_imas
    FROM produtos
    WHERE empresa_id = eid
      AND qtd_imas >= 4
      AND ativo = true
      AND nome NOT ILIKE '%Chaveiro%'
      AND nome NOT ILIKE '%Misto%'
    ORDER BY qtd_imas
  LOOP
    -- Kit misto sem espelho
    INSERT INTO produtos (empresa_id, nome, preco_venda, qtd_imas, ativo)
    VALUES (
      eid,
      REPLACE(r.nome, 'Kit', 'Kit Misto') || ' sem espelho',
      r.preco_venda,
      r.qtd_imas - 2,
      true
    );

    -- Kit misto com espelho
    INSERT INTO produtos (empresa_id, nome, preco_venda, qtd_imas, ativo)
    VALUES (
      eid,
      REPLACE(r.nome, 'Kit', 'Kit Misto') || ' com espelho',
      r.preco_venda,
      r.qtd_imas - 2,
      true
    );

    RAISE NOTICE 'Criado: Kit Misto de % (% ímãs + 2 chaveiros) = R$ %', r.nome, r.qtd_imas - 2, r.preco_venda;
  END LOOP;
END $$;
