-- AJUSTE 21: Corrige meta de recuperação — volta para R$650
-- Os R$175 em compras NÃO saíram do bolso pessoal, saíram do caixa do negócio
-- Portanto não entram no investimento inicial

UPDATE configuracoes_materiais SET investimento_inicial = 650;
