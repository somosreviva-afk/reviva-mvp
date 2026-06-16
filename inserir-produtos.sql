-- ================================================
-- PRODUTOS REVIVA — IMÃS DE FOTO
-- Cole no Supabase → SQL Editor → Run
-- ================================================

DELETE FROM produtos WHERE empresa_id = '2f8d31ea-2527-49d8-847a-24192e45216e';

INSERT INTO produtos (empresa_id, nome, descricao, custo_materiais, custo_adicional, preco_venda, estoque, ativo)
VALUES
  ('2f8d31ea-2527-49d8-847a-24192e45216e', '✨ Kit Amor (6 fotos)',     '6 imãs de foto artesanais',               18.00, 2.25, 69.90,  0, true),
  ('2f8d31ea-2527-49d8-847a-24192e45216e', '✨ Kit Memórias (8 fotos)', '8 imãs de foto artesanais',               24.00, 2.25, 89.90,  0, true),
  ('2f8d31ea-2527-49d8-847a-24192e45216e', '⭐ Kit Favorito (10 fotos)','10 imãs de foto artesanais — mais vendido',30.00, 2.60, 109.90, 0, true),
  ('2f8d31ea-2527-49d8-847a-24192e45216e', '💖 Kit Premium (12 fotos)', '12 imãs de foto artesanais — mais completo',36.00, 2.60, 129.90, 0, true),
  ('2f8d31ea-2527-49d8-847a-24192e45216e', '📝 Encomenda Personalizada','Pedido manual — preço definido na hora',   0,     0,    0,      999, true);

-- Conferir resultado (custo_total, lucro e margem são calculados automaticamente)
SELECT nome, preco_venda, custo_total, lucro_unitario, margem_lucro
FROM produtos
WHERE empresa_id = '2f8d31ea-2527-49d8-847a-24192e45216e'
ORDER BY preco_venda;
