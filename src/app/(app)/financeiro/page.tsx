import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TrendingUp, TrendingDown, Plus, BarChart2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user!.id)
    .single()

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const mesLabel = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  // Pedidos do mês
  const { data: pedidosMes } = await supabase
    .from('pedidos')
    .select('valor_total, valor_recebido, custo_total_pedido, lucro_real, frete_valor, forma_pagamento, tipo')
    .eq('empresa_id', usuario!.empresa_id)
    .not('status', 'eq', 'cancelado')
    .gte('created_at', inicioMes + 'T00:00:00')

  // Compras de materiais do mês (saída real de caixa)
  const { data: comprasMaterial } = await supabase
    .from('movimentacoes_estoque')
    .select('valor_pago, observacoes, data, insumos(nome)')
    .eq('empresa_id', usuario!.empresa_id)
    .eq('tipo', 'entrada')
    .not('valor_pago', 'is', null)
    .gte('data', inicioMes)

  // Movimentações manuais do mês
  const { data: transacoes } = await supabase
    .from('financeiro')
    .select('*')
    .eq('empresa_id', usuario!.empresa_id)
    .gte('data', inicioMes)
    .order('data', { ascending: false })

  const pedidos = pedidosMes || []
  const lista = transacoes || []

  // Recebido por forma de pagamento (só vendas, não mimos)
  const vendasPedidos = pedidos.filter(p => p.tipo !== 'mimo')
  const totalPix = vendasPedidos.filter(p => p.forma_pagamento === 'pix')
    .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
  const totalLink = vendasPedidos.filter(p => p.forma_pagamento === 'link' || p.forma_pagamento === 'link_pagamento')
    .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
  const totalCartao = vendasPedidos.filter(p => p.forma_pagamento === 'cartao')
    .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
  const totalRecebido = totalPix + totalLink + totalCartao

  // Lucro real = recebido - custo materiais dos pedidos
  const lucroReal = pedidos.reduce((s, p) => s + Number(p.lucro_real || 0), 0)

  // Saídas do caixa
  const totalCompras = (comprasMaterial || []).reduce((s, c) => s + Number(c.valor_pago || 0), 0)
  const totalEntradasManuais = lista.filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0)
  const totalSaidasManuais = lista.filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0)

  // Saldo = o que entrou no bolso - o que saiu do bolso
  const saldoCaixa = totalRecebido - totalCompras - totalSaidasManuais + totalEntradasManuais

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center justify-between pt-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caixa</h1>
          <p className="text-sm text-gray-500 capitalize">{mesLabel}</p>
        </div>
        <Link href="/relatorios" className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <BarChart2 size={14} className="text-green-700" />
          <span className="text-xs font-semibold text-green-700">Relatórios</span>
          <ChevronRight size={12} className="text-green-500" />
        </Link>
      </div>

      {/* Lucro Real — número mais importante */}
      <div className={`rounded-2xl p-5 mb-4 ${lucroReal >= 0 ? 'bg-green-600' : 'bg-red-500'}`}>
        <p className="text-sm text-green-200 mb-1">Lucro Real do Mês</p>
        <p className="text-3xl font-bold text-white">{formatCurrency(lucroReal)}</p>
        <p className="text-xs text-green-200 mt-1">
          {formatCurrency(totalRecebido)} recebido − {formatCurrency(pedidos.reduce((s,p) => s + Number(p.custo_total_pedido||0),0))} em materiais dos pedidos
        </p>
      </div>

      {/* Movimentações do mês */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">

        {/* Recebido */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={14} className="text-green-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Recebido de vendas</span>
            </div>
            <span className="text-base font-bold text-green-700">{formatCurrency(totalRecebido)}</span>
          </div>
          <div className="flex gap-2">
            {totalPix > 0 && (
              <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                Pix {formatCurrency(totalPix)}
              </span>
            )}
            {totalLink > 0 && (
              <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                Link {formatCurrency(totalLink)}
              </span>
            )}
            {totalCartao > 0 && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                Cartão {formatCurrency(totalCartao)}
              </span>
            )}
            {totalRecebido === 0 && (
              <span className="text-xs text-gray-400">Nenhuma venda registrada</span>
            )}
          </div>
        </div>

        {/* Compras de material (saída do caixa) */}
        {totalCompras > 0 && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingDown size={14} className="text-orange-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Compras de material</span>
              </div>
              <span className="text-base font-bold text-orange-600">−{formatCurrency(totalCompras)}</span>
            </div>
            <p className="text-xs text-gray-400 ml-9">saiu do caixa para comprar insumos</p>
          </div>
        )}

        {/* Saídas manuais */}
        {totalSaidasManuais > 0 && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown size={14} className="text-red-500" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Outras saídas</span>
              </div>
              <span className="text-base font-bold text-red-500">−{formatCurrency(totalSaidasManuais)}</span>
            </div>
          </div>
        )}

        {/* Entradas manuais */}
        {totalEntradasManuais > 0 && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center">
                  <TrendingUp size={14} className="text-teal-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Outras entradas</span>
              </div>
              <span className="text-base font-bold text-teal-600">+{formatCurrency(totalEntradasManuais)}</span>
            </div>
          </div>
        )}

        {/* Saldo */}
        <div className={`p-4 ${saldoCaixa >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800">Dinheiro em caixa</p>
              <p className="text-xs text-gray-500 mt-0.5">o que sobrou no seu bolso este mês</p>
            </div>
            <p className={`text-xl font-bold ${saldoCaixa >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(saldoCaixa)}
            </p>
          </div>
        </div>
      </div>

      {/* Botões */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link href="/financeiro/nova-entrada"
          className="flex items-center justify-center gap-2 bg-green-100 text-green-700 py-3 rounded-xl font-medium text-sm">
          <Plus size={16} /> Entrada
        </Link>
        <Link href="/financeiro/nova-saida"
          className="flex items-center justify-center gap-2 bg-red-100 text-red-600 py-3 rounded-xl font-medium text-sm">
          <Plus size={16} /> Saída
        </Link>
      </div>

      {/* Histórico manual */}
      {lista.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-700 text-sm mb-3">Movimentações manuais</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 mb-4">
            {lista.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.descricao}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.data)}</p>
                </div>
                <p className={`text-sm font-bold ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.tipo === 'entrada' ? '+' : '−'}{formatCurrency(t.valor)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {pedidos.length === 0 && lista.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">Nenhuma movimentação este mês</p>
      )}
    </div>
  )
}
