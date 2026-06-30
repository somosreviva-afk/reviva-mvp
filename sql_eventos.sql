-- ============================================================
-- REVIVA EVENTOS — SQL de criação das tabelas
-- Execute no Supabase SQL Editor
-- ============================================================

-- Clientes de eventos (separado dos clientes de imãs)
CREATE TABLE IF NOT EXISTS eventos_clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  instagram TEXT,
  cidade TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Leads / CRM Kanban (11 estágios)
CREATE TABLE IF NOT EXISTS eventos_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES eventos_clientes(id) ON DELETE SET NULL,
  nome_responsavel TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  tipo_evento TEXT, -- casamento, aniversario, corporativo, formatura, etc.
  data_evento DATE,
  local_evento TEXT,
  qtd_convidados INTEGER,
  estagio TEXT NOT NULL DEFAULT 'novo_lead',
  -- estagios: novo_lead, contato_feito, proposta_enviada, negociacao, contrato_assinado,
  --           sinal_pago, preparacao, evento_realizado, pos_evento, feedback_recebido, cliente_finalizado
  ordem INTEGER DEFAULT 0,
  valor_estimado NUMERIC(10,2),
  observacoes TEXT,
  origem TEXT, -- instagram, indicacao, site, whatsapp, etc.
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Orçamentos de eventos
CREATE TABLE IF NOT EXISTS eventos_orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES eventos_leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES eventos_clientes(id) ON DELETE SET NULL,
  numero TEXT UNIQUE NOT NULL, -- ORC-001, ORC-002...
  status TEXT DEFAULT 'rascunho', -- rascunho, enviado, aprovado, recusado, expirado
  data_evento DATE,
  local_evento TEXT,
  qtd_convidados INTEGER,
  horas_evento INTEGER DEFAULT 4,
  -- Custos
  custo_fotoimagas NUMERIC(10,2) DEFAULT 0,
  custo_auxiliar NUMERIC(10,2) DEFAULT 0,
  custo_combustivel NUMERIC(10,2) DEFAULT 0,
  custo_pedagio NUMERIC(10,2) DEFAULT 0,
  custo_alimentacao NUMERIC(10,2) DEFAULT 0,
  custo_hospedagem NUMERIC(10,2) DEFAULT 0,
  custo_embalagem NUMERIC(10,2) DEFAULT 0,
  custo_outros NUMERIC(10,2) DEFAULT 0,
  custo_total NUMERIC(10,2) DEFAULT 0,
  margem_lucro NUMERIC(5,2) DEFAULT 30, -- porcentagem
  valor_sugerido NUMERIC(10,2) DEFAULT 0,
  valor_final NUMERIC(10,2),
  sinal_percentual NUMERIC(5,2) DEFAULT 50,
  validade_dias INTEGER DEFAULT 7,
  observacoes TEXT,
  itens_inclusos TEXT[], -- array de itens: ['fotoimas', 'moldura', 'tela_personalizada']
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Eventos confirmados
CREATE TABLE IF NOT EXISTS eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID REFERENCES eventos_orcamentos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES eventos_clientes(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES eventos_leads(id) ON DELETE SET NULL,
  nome_evento TEXT NOT NULL,
  tipo_evento TEXT,
  data_evento DATE NOT NULL,
  horario_inicio TIME,
  horario_fim TIME,
  local_evento TEXT,
  endereco TEXT,
  cidade TEXT,
  qtd_convidados INTEGER,
  status TEXT DEFAULT 'confirmado', -- confirmado, em_andamento, realizado, cancelado
  valor_contrato NUMERIC(10,2),
  valor_sinal NUMERIC(10,2) DEFAULT 0,
  sinal_pago BOOLEAN DEFAULT FALSE,
  sinal_pago_em TIMESTAMPTZ,
  valor_restante NUMERIC(10,2) DEFAULT 0,
  restante_pago BOOLEAN DEFAULT FALSE,
  restante_pago_em TIMESTAMPTZ,
  custo_total NUMERIC(10,2) DEFAULT 0,
  lucro_estimado NUMERIC(10,2) DEFAULT 0,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Equipamentos
CREATE TABLE IF NOT EXISTS eventos_equipamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  custo_aquisicao NUMERIC(10,2) DEFAULT 0,
  data_aquisicao DATE,
  vida_util_meses INTEGER DEFAULT 24,
  custo_por_evento NUMERIC(10,2) DEFAULT 0, -- depreciação calculada
  ativo BOOLEAN DEFAULT TRUE,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Equipamentos usados em eventos
CREATE TABLE IF NOT EXISTS eventos_equipamentos_uso (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  equipamento_id UUID REFERENCES eventos_equipamentos(id) ON DELETE CASCADE,
  custo_depreciacao NUMERIC(10,2) DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Checklists templates
CREATE TABLE IF NOT EXISTS eventos_checklist_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_evento TEXT, -- null = todos os tipos
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do checklist template
CREATE TABLE IF NOT EXISTS eventos_checklist_template_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES eventos_checklist_templates(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT, -- preparacao, no_dia, pos_evento
  ordem INTEGER DEFAULT 0,
  obrigatorio BOOLEAN DEFAULT FALSE
);

-- Checklists de eventos específicos
CREATE TABLE IF NOT EXISTS eventos_checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  categoria TEXT,
  concluido BOOLEAN DEFAULT FALSE,
  concluido_em TIMESTAMPTZ,
  ordem INTEGER DEFAULT 0,
  obrigatorio BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Financeiro de eventos (pagamentos recebidos/gastos)
CREATE TABLE IF NOT EXISTS eventos_financeiro (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES eventos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL, -- receita, despesa
  categoria TEXT, -- sinal, restante, combustivel, alimentacao, etc.
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_lancamento DATE DEFAULT CURRENT_DATE,
  pago BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de preços por faixa de convidados
CREATE TABLE IF NOT EXISTS eventos_tabela_precos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qtd_min INTEGER NOT NULL,
  qtd_max INTEGER NOT NULL,
  preco_sugerido NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações do módulo de eventos
CREATE TABLE IF NOT EXISTS eventos_configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor TEXT,
  descricao TEXT,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO eventos_configuracoes (chave, valor, descricao) VALUES
  ('custo_fotoimagas_por_convidado', '1.75', 'Custo de fotoímã por convidado (R$)'),
  ('custo_auxiliar_hora', '30.00', 'Custo por hora de auxiliar (R$)'),
  ('margem_lucro_padrao', '40', 'Margem de lucro padrão (%)'),
  ('sinal_percentual_padrao', '50', 'Percentual de sinal padrão (%)'),
  ('validade_orcamento_dias', '7', 'Validade padrão do orçamento (dias)'),
  ('nome_empresa', 'Reviva Imãs', 'Nome da empresa para documentos'),
  ('telefone_empresa', '', 'Telefone para documentos'),
  ('instagram_empresa', '', 'Instagram para documentos'),
  ('pix_empresa', '', 'Chave PIX para documentos')
ON CONFLICT (chave) DO NOTHING;

-- Inserir tabela de preços padrão
INSERT INTO eventos_tabela_precos (qtd_min, qtd_max, preco_sugerido, descricao) VALUES
  (1, 50, 350.00, 'Até 50 convidados'),
  (51, 100, 550.00, '51 a 100 convidados'),
  (101, 150, 750.00, '101 a 150 convidados'),
  (151, 200, 950.00, '151 a 200 convidados'),
  (201, 300, 1300.00, '201 a 300 convidados'),
  (301, 9999, 1800.00, 'Acima de 300 convidados')
ON CONFLICT DO NOTHING;

-- Inserir checklist template padrão
INSERT INTO eventos_checklist_templates (nome, descricao) VALUES
  ('Checklist Padrão de Evento', 'Checklist padrão para todos os tipos de evento')
ON CONFLICT DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_eventos_leads_estagio ON eventos_leads(estagio);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON eventos(data_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_status ON eventos(status);
CREATE INDEX IF NOT EXISTS idx_eventos_orcamentos_status ON eventos_orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_eventos_financeiro_evento ON eventos_financeiro(evento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_checklists_evento ON eventos_checklists(evento_id);
