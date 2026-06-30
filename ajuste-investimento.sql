-- AJUSTE 18: Adiciona R$175 ao investimento (compra de componentes do ímã)
-- R$650 inicial + R$175 materiais = R$825 total a recuperar

UPDATE configuracoes_materiais
SET investimento_inicial = investimento_inicial + 175;
