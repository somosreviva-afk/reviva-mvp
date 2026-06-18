-- Tabela de configurações de materiais por empresa
CREATE TABLE IF NOT EXISTS configuracoes_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  ima_custo numeric(10,4) DEFAULT 3.00,
  caixa_custo numeric(10,4) DEFAULT 1.23,
  saquinho_custo numeric(10,4) DEFAULT 0.35,
  envelope_custo numeric(10,4) DEFAULT 0.28,
  papel_seda_custo numeric(10,4) DEFAULT 0.10,
  cartao_custo numeric(10,4) DEFAULT 0.16,
  impressao_valor_folha numeric(10,4) DEFAULT 2.00,
  impressao_fotos_por_folha integer DEFAULT 12,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id)
);

-- RLS para configuracoes_materiais
ALTER TABLE configuracoes_materiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios podem gerenciar materiais da sua empresa"
  ON configuracoes_materiais
  FOR ALL
  USING (
    empresa_id IN (
      SELECT empresa_id FROM usuarios WHERE id = auth.uid()
    )
  );

-- Adiciona qtd_imas nos produtos
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS qtd_imas integer DEFAULT 0;

-- Preenche kits existentes
UPDATE produtos SET qtd_imas = 6  WHERE nome LIKE '%Kit Amor%';
UPDATE produtos SET qtd_imas = 8  WHERE nome LIKE '%Kit Memórias%';
UPDATE produtos SET qtd_imas = 10 WHERE nome LIKE '%Kit Favorito%';
UPDATE produtos SET qtd_imas = 12 WHERE nome LIKE '%Kit Premium%';

-- Adiciona colunas de custo nos pedidos
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS qtd_imas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_imas numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_impressao numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_saquinhos numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_caixa numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_envelope numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_papel_seda numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_cartao numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_total_pedido numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lucro_real numeric(10,2) DEFAULT 0;
