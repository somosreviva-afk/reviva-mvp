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

  const custoproducao = pedidos.reduce((s, p) => s + Number(p.custo_total_pedido || 0), 0)

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

      {/* Dinheiro em Caixa — número principal */}
      <div className={`rounded-2xl p-5 mb-4 ${saldoCaixa >= 0 ? 'bg-green-600' : 'bg-red-500'}`}>
        <p className="text-sm text-green-200 mb-1">Dinheiro em Caixa</p>
        <p className="text-3xl font-bold text-white">{formatCurrency(saldoCaixa)}</p>
        <p className="text-xs text-green-200 mt-1">
          {formatCurrency(totalRecebido)} recebido − {formatCurrency(totalCompras + totalSaidasManuais - totalEntradasManuais)} em saídas
        </p>
      </div>

      {/* Divisão do caixa */}
      {saldoCaixa > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Como dividir o saldo</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">Seu salário (⅓)</span>
              </div>
              <span className="text-sm font-bold text-green-600">{formatCurrency(saldoCaixa / 3)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-700">Investimento/estoque (⅓)</span>
              </div>
              <span className="text-sm font-bold text-blue-600">{formatCurrency(saldoCaixa / 3)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-sm text-gray-700">Reserva (⅓)</span>
              </div>
              <span className="text-sm font-bold text-purple-600">{formatCurrency(saldoCaixa / 3)}</span>
            </div>
            <p className="text-[10px] text-gray-300 mt-1">Baseado no saldo disponível agora · só uma sugestão</p>
          </div>
        </div>
      )}

      {/* Breakdown do mês */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">

        {/* Recebido de vendas */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={14} className="text-green-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Recebido de vendas</span>
            </div>
            <span className="text-base font-bold text-green-700">+{formatCurrency(totalRecebido)}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
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

        {/* Compras de material */}
        <Link href="/financeiro/compras" className="p-4 border-b border-gray-100 flex items-center justify-between group">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingDown size={14} className="text-orange-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Compras de material</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-base font-bold text-orange-600">
                  {totalCompras > 0 ? `−${formatCurrency(totalCompras)}` : formatCurrency(0)}
                </span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>
            <p className="text-xs text-gray-400 ml-9">toque para ver detalhes</p>
          </div>
        </Link>

        {/* Custo de produção */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                <TrendingDown size={14} className="text-amber-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Custo de produção</span>
            </div>
            <span className="text-base font-bold text-amber-600">
              {custoproducao > 0 ? `−${formatCurrency(custoproducao)}` : formatCurrency(0)}
            </span>
          </div>
          <p className="text-xs text-gray-400 ml-9">materiais consumidos nos pedidos ({pedidos.length} pedidos)</p>
        </div>

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

        {/* Lucro Real — linha final informativa */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700">Lucro Real</p>
              <p className="text-xs text-gray-400 mt-0.5">vendas − custo de produção</p>
            </div>
            <p className={`text-base font-bold ${lucroReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(lucroReal)}
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
