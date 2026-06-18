-- Tabela de insumos (materiais em estoque)
CREATE TABLE IF NOT EXISTS insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  -- tipos: 'ima', 'caixa', 'saquinho', 'envelope', 'papel_seda', 'cartao', 'folha_impressao'
  nome text NOT NULL,
  quantidade numeric(10,3) DEFAULT 0,
  unidade text DEFAULT 'unidade',
  estoque_minimo numeric(10,3) DEFAULT 0,
  custo_unitario numeric(10,4) DEFAULT 0,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id, tipo)
);

-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  insumo_id uuid REFERENCES insumos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade numeric(10,3) NOT NULL,
  valor_pago numeric(10,2),
  custo_unitario numeric(10,4),
  pedido_id uuid REFERENCES pedidos(id) ON DELETE SET NULL,
  observacoes text,
  data date DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios gerenciam insumos da empresa"
  ON insumos FOR ALL
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "usuarios gerenciam movimentacoes da empresa"
  ON movimentacoes_estoque FOR ALL
  USING (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()))
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid()));

-- Flag para controle de baixa de estoque nos pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estoque_descontado boolean DEFAULT false;
