-- Adiciona campos do cliente direto no orçamento
ALTER TABLE eventos_orcamentos
  ADD COLUMN IF NOT EXISTS nome_cliente TEXT,
  ADD COLUMN IF NOT EXISTS telefone_cliente TEXT,
  ADD COLUMN IF NOT EXISTS email_cliente TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS qtd_fotoimagas INTEGER; -- estimativa de ímãs (pode diferir dos convidados)

-- Novas configurações editáveis do sistema de PDF
INSERT INTO eventos_configuracoes (chave, valor, descricao) VALUES
  ('cor_primaria', '#b5005e', 'Cor principal da Reviva para os PDFs'),
  ('texto_apresentacao', 'Olá! Ficamos muito felizes pelo interesse em tornar o seu evento ainda mais especial. A Reviva transforma momentos únicos em lembranças inesquecíveis através dos nossos fotoímãs produzidos ao vivo durante o evento. Enquanto seus convidados aproveitam a festa, registramos os melhores momentos e entregamos, em poucos minutos, fotoímãs personalizados que serão levados para casa como uma recordação exclusiva desse dia.', 'Texto de apresentação no PDF do orçamento'),
  ('condicoes_pagamento', 'Entrada de 50% para reserva da data.|Saldo restante até uma semana antes do evento.|Pagamento via PIX.|Pagamento via Cartão de Crédito (com acréscimo das taxas da operadora).', 'Condições de pagamento (separadas por |)'),
  ('mensagem_rodape', 'Obrigada por considerar a Reviva para fazer parte desse momento tão especial. ✨', 'Mensagem de rodapé nos documentos'),
  ('instagram_orcamento', '@somos_reviva', 'Instagram exibido nos orçamentos')
ON CONFLICT (chave) DO NOTHING;
