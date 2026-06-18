import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TrendingUp, TrendingDown, Plus, DollarSign, Package, Heart, CreditCard } from 'lucide-react'
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

  // Dados dos pedidos do mês (não cancelados)
  const { data: pedidosMes } = await supabase
    .from('pedidos')
    .select('valor_total, valor_recebido, custo_total_pedido, lucro_real, frete_valor')
    .eq('empresa_id', usuario!.empresa_id)
    .not('status', 'eq', 'cancelado')
    .gte('created_at', inicioMes + 'T00:00:00')

  // Movimentações manuais do financeiro
  const { data: transacoes } = await supabase
    .from('financeiro')
    .select('*')
    .eq('empresa_id', usuario!.empresa_id)
    .gte('data', inicioMes)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  const pedidos = pedidosMes || []
  const lista = transacoes || []

  // Indicadores dos pedidos
  const valorVendido = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0)
  const valorRecebido = pedidos.reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
  const custosMaterial = pedidos.reduce((s, p) => s + Number(p.custo_total_pedido || 0), 0)
  const custosCorreio = pedidos.reduce((s, p) => s + Number(p.frete_valor || 0), 0)
  const lucroReal = pedidos.reduce((s, p) => s + Number(p.lucro_real || 0), 0)

  // Movimentações manuais
  const totalEntradas = lista.filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0)
  const totalSaidas = lista.filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0)
  const saldoManual = totalEntradas - totalSaidas

  return (
    <div className="p-4">
      <div className="flex items-center justify-between pt-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 capitalize">{mesLabel}</p>
        </div>
      </div>

      {/* Indicadores dos Pedidos */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Resumo dos Pedidos</p>

      {/* Lucro Real — destaque */}
      <div className={`rounded-2xl p-5 mb-3 text-white ${lucroReal >= 0 ? 'bg-green-600' : 'bg-red-500'}`}>
        <p className="text-sm text-green-200 mb-1">💖 Lucro Real do Mês</p>
        <p className="text-3xl font-bold">{formatCurrency(lucroReal)}</p>
        {pedidos.length > 0 && (
          <p className="text-xs text-green-200 mt-1">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} no mês</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign size={14} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">💰 Valor Vendido</span>
          </div>
          <p className="text-base font-bold text-blue-700">{formatCurrency(valorVendido)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <CreditCard size={14} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-500">💳 Valor Recebido</span>
          </div>
          <p className="text-base font-bold text-green-700">{formatCurrency(valorRecebido)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
              <Package size={14} className="text-orange-600" />
            </div>
            <span className="text-xs text-gray-500">📦 Custos Material</span>
          </div>
          <p className="text-base font-bold text-orange-600">{formatCurrency(custosMaterial)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingDown size={14} className="text-purple-600" />
            </div>
            <span className="text-xs text-gray-500">📮 Custos Correio</span>
          </div>
          <p className="text-base font-bold text-purple-600">{formatCurrency(custosCorreio)}</p>
        </div>
      </div>

      {/* Movimentações Manuais */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 mt-2">Movimentações Manuais</p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={14} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-500">Entradas</span>
          </div>
          <p className="text-base font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown size={14} className="text-red-500" />
            </div>
            <span className="text-xs text-gray-500">Saídas</span>
          </div>
          <p className="text-base font-bold text-red-500">{formatCurrency(totalSaidas)}</p>
        </div>
      </div>

      {/* Botões */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link
          href="/financeiro/nova-entrada"
          className="flex items-center justify-center gap-2 bg-green-100 text-green-700 py-3 rounded-xl font-medium text-sm"
        >
          <Plus size={16} /> Entrada
        </Link>
        <Link
          href="/financeiro/nova-saida"
          className="flex items-center justify-center gap-2 bg-red-100 text-red-600 py-3 rounded-xl font-medium text-sm"
        >
          <Plus size={16} /> Saída
        </Link>
      </div>

      {/* Histórico manual */}
      {lista.length > 0 && (
        <>
          <h2 className="font-semibold text-gray-900 mb-3">Histórico Manual</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 mb-6">
            {lista.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.descricao}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(t.data)}</p>
                </div>
                <p className={`text-sm font-bold ${t.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.tipo === 'entrada' ? '+' : '-'}{formatCurrency(t.valor)}
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
