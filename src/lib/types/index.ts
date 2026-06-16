export interface Empresa {
  id: string
  nome: string
  cnpj?: string
  telefone?: string
  email?: string
  logo_url?: string
}

export interface Usuario {
  id: string
  empresa_id: string
  nome: string
  email: string
  role: 'admin' | 'vendedor' | 'producao'
}

export interface Material {
  id: string
  empresa_id: string
  nome: string
  unidade: string
  estoque_atual: number
  estoque_minimo: number
  custo_unitario: number
  fornecedor?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface Categoria {
  id: string
  empresa_id: string
  nome: string
  cor: string
}

export interface Produto {
  id: string
  empresa_id: string
  categoria_id?: string
  nome: string
  descricao?: string
  foto_url?: string
  preco_venda: number
  custo_materiais: number
  custo_adicional: number
  custo_total: number
  lucro_unitario: number
  margem_lucro: number
  estoque: number
  ativo: boolean
  created_at: string
  categoria?: Categoria
}

export interface ProdutoMaterial {
  id: string
  produto_id: string
  material_id: string
  quantidade: number
  material?: Material
}

export interface Cliente {
  id: string
  empresa_id: string
  nome: string
  telefone?: string
  whatsapp?: string
  email?: string
  endereco?: string
  cidade?: string
  observacoes?: string
  total_gasto: number
  num_pedidos: number
  created_at: string
}

export type StatusPedido = 'orcamento' | 'aprovado' | 'producao' | 'finalizado' | 'entregue' | 'cancelado'

export interface Pedido {
  id: string
  empresa_id: string
  cliente_id: string
  numero: number
  status: StatusPedido
  data_pedido: string
  data_entrega?: string
  valor_total: number
  custo_total: number
  lucro_total: number
  desconto: number
  forma_pagamento?: string
  observacoes?: string
  created_at: string
  cliente?: Cliente
  itens?: PedidoItem[]
}

export interface PedidoItem {
  id: string
  pedido_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  custo_unitario: number
  subtotal: number
  custo_subtotal: number
  descricao_item?: string
  produto?: Produto
}

export interface Financeiro {
  id: string
  empresa_id: string
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string
  valor: number
  data: string
  pedido_id?: string
  created_at: string
}
