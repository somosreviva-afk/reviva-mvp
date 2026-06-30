-- Atualiza o custo do fotoímã para R$4,50 por convidado nos eventos
-- (insumo + impressão da foto)
UPDATE eventos_configuracoes
SET valor = '4.50', atualizado_em = NOW()
WHERE chave = 'custo_fotoimagas_por_convidado';
