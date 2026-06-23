-- AJUSTE 11: Sistema de lotes FIFO para controle automático de custo por compra
-- Cada compra cria um lote. Quando o lote atual esgota, o próximo ativa e o custo atualiza automaticamente.

CREATE TABLE IF NOT EXISTS lotes_estoque (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
  quantidade_inicial numeric(10,3) NOT NULL,
  quantidade_restante numeric(10,3) NOT NULL,
  custo_unitario numeric(10,4),          -- custo por unidade deste lote (para ímãs = custo por conjunto de 4 peças)
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('ativo', 'pendente', 'esgotado')),
  data_compra date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lotes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lotes_empresa_propria" ON lotes_estoque
  FOR ALL USING (
    empresa_id IN (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
  );

-- Migra estoque atual: cada insumo com quantidade > 0 vira um lote ativo com o custo cadastrado
INSERT INTO lotes_estoque (
  empresa_id, insumo_id, quantidade_inicial, quantidade_restante, custo_unitario, status, data_compra
)
SELECT
  empresa_id,
  id,
  GREATEST(quantidade, 0),
  GREATEST(quantidade, 0),
  custo_unitario,
  'ativo',
  CURRENT_DATE
FROM insumos
WHERE quantidade > 0
  AND empresa_id IS NOT NULL;
