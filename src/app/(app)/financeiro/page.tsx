import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TrendingUp, TrendingDown, Plus, BarChart2, ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

function urlMes(mes: number, ano: number) {
  return `/financeiro?mes=${mes}&ano=${ano}`
}

function nomeMes(mes: number, ano: number) {
  return new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string }>
}) {
  const params = await searchParams
  const hoje = new Date()
  const mesAtual = hoje.getMonth()
  const anoAtual = hoje.getFullYear()

  const mesSel = params.mes !== undefined ? parseInt(params.mes) : mesAtual
  const anoSel = params.ano !== undefined ? parseInt(params.ano) : anoAtual
  const ehMesAtual = mesSel === mesAtual && anoSel === anoAtual

  const mesPrev = mesSel === 0 ? 11 : mesSel - 1
  const anoPrev = mesSel === 0 ? anoSel - 1 : anoSel
  const mesNext = mesSel === 11 ? 0 : mesSel + 1
  const anoNext = mesSel === 11 ? anoSel + 1 : anoSel

  const inicioMes = new Date(anoSel, mesSel, 1).toISOString().split('T')[0]
  const fimMes = new Date(anoSel, mesSel + 1, 1).toISOString().split('T')[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user!.id)
    .single()

  // ── CAIXA TOTAL (todos os tempos) ───────────────────────────────
  const { data: todosPedidos } = await supabase
    .from('pedidos')
    .select('valor_recebido, valor_total, forma_pagamento, tipo')
    .eq('empresa_id', usuario!.empresa_id)
    .not('status', 'eq', 'cancelado')

  const { data: todasCompras } = await supabase
    .from('movimentacoes_estoque')
    .select('valor_pago')
    .eq('empresa_id', usuario!.empresa_id)
    .eq('tipo', 'entrada')
    .not('valor_pago', 'is', null)

  const { data: todasTransacoes } = await supabase
    .from('financeiro')
    .select('tipo, valor')
    .eq('empresa_id', usuario!.empresa_id)

  const totalRecebidoGeral = (todosPedidos || [])
    .filter(p => p.tipo !== 'mimo')
    .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
  const totalComprasGeral = (todasCompras || []).reduce((s, c) => s + Number(c.valor_pago || 0), 0)
  const totalSaidasGeral = (todasTransacoes || []).filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0)
  const totalEntradasGeral = (todasTransacoes || []).filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0)
  const caixaTotal = totalRecebidoGeral - totalComprasGeral - totalSaidasGeral + totalEntradasGeral

  // Pedidos do mês selecionado
  const { data: pedidosMes } = await supabase
    .from('pedidos')
    .select('valor_total, valor_recebido, custo_total_pedido, lucro_real, frete_valor, forma_pagamento, tipo')
    .eq('empresa_id', usuario!.empresa_id)
    .not('status', 'eq', 'cancelado')
    .gte('created_at', inicioMes + 'T00:00:00')
    .lt('created_at', fimMes + 'T00:00:00')

  // Compras de materiais do mês
  const { data: comprasMaterial } = await supabase
    .from('movimentacoes_estoque')
    .select('valor_pago, observacoes, data, insumos(nome)')
    .eq('empresa_id', usuario!.empresa_id)
    .eq('tipo', 'entrada')
    .not('valor_pago', 'is', null)
    .gte('data', inicioMes)
    .lt('data', fimMes)

  // Movimentações manuais do mês
  const { data: transacoes } = await supabase
    .from('financeiro')
    .select('*')
    .eq('empresa_id', usuario!.empresa_id)
    .gte('data', inicioMes)
    .lt('data', fimMes)
    .order('data', { ascending: false })

  const pedidos = pedidosMes || []
  const lista = transacoes || []

  const vendasPedidos = pedidos.filter(p => p.tipo !== 'mimo')
  const totalPix = vendasPedidos.filter(p => p.forma_pagamento === 'pix')
    .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
  const totalLink = vendasPedidos.filter(p => p.forma_pagamento === 'link' || p.forma_pagamento === 'link_pagamento')
    .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
  const totalCartao = vendasPedidos.filter(p => p.forma_pagamento === 'cartao')
    .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
  const totalRecebido = totalPix + totalLink + totalCartao

  const lucroReal = pedidos.reduce((s, p) => s + Number(p.lucro_real || 0), 0)
  const totalCompras = (comprasMaterial || []).reduce((s, c) => s + Number(c.valor_pago || 0), 0)
  const totalEntradasManuais = lista.filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0)
  const totalSaidasManuais = lista.filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0)
  const saldoCaixa = totalRecebido - totalCompras - totalSaidasManuais + totalEntradasManuais
  const custoproducao = pedidos.reduce((s, p) => s + Number(p.custo_total_pedido || 0), 0)

  return (
    <div className="p-4 pb-24">
      {/* CAIXA TOTAL */}
      <div className={`rounded-2xl px-5 py-4 mt-4 mb-4 flex items-center justify-between ${caixaTotal >= 0 ? 'bg-purple-700' : 'bg-red-600'}`}>
        <div>
          <p className="text-xs text-purple-200 font-medium uppercase tracking-wide">Caixa Total</p>
          <p className="text-2xl font-bold text-white mt-0.5">{formatCurrency(caixaTotal)}</p>
          <p className="text-[10px] text-purple-300 mt-1">tudo que entrou menos tudo que saiu</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-purple-300">Entradas</p>
          <p className="text-sm font-semibold text-white">{formatCurrency(totalRecebidoGeral + totalEntradasGeral)}</p>
          <p className="text-[10px] text-purple-300 mt-1">Saídas</p>
          <p className="text-sm font-semibold text-purple-200">{formatCurrency(totalComprasGeral + totalSaidasGeral)}</p>
        </div>
      </div>

      {/* Header com navegação de mês */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caixa</h1>
        </div>
        <Link href="/relatorios" className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <BarChart2 size={14} className="text-green-700" />
          <span className="text-xs font-semibold text-green-700">Relatórios</span>
          <ChevronRight size={12} className="text-green-500" />
        </Link>
      </div>

      {/* Navegação de meses */}
      <div className="flex items-center gap-2 mb-5">
        <Link
          href={urlMes(mesPrev, anoPrev)}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm py-2.5 px-3 text-center">
          <p className="text-sm font-semibold text-gray-800 capitalize">{nomeMes(mesSel, anoSel)}</p>
          {ehMesAtual && <p className="text-[10px] text-green-600">mês atual</p>}
        </div>
        <Link
          href={urlMes(mesNext, anoNext)}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm active:scale-95 transition-transform ${
            ehMesAtual
              ? 'bg-gray-50 border-gray-100 pointer-events-none opacity-30'
              : 'bg-white border-gray-200'
          }`}
        >
          <ChevronRight size={18} className="text-gray-600" />
        </Link>
      </div>

      {/* Dinheiro em Caixa */}
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
            <p className="text-[10px] text-gray-300 mt-1">Baseado no saldo disponível · só uma sugestão</p>
          </div>
        </div>
      )}

      {/* Breakdown do mês */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
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
              <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">Pix {formatCurrency(totalPix)}</span>
            )}
            {totalLink > 0 && (
              <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">Link {formatCurrency(totalLink)}</span>
            )}
            {totalCartao > 0 && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">Cartão {formatCurrency(totalCartao)}</span>
            )}
            {totalRecebido === 0 && <span className="text-xs text-gray-400">Nenhuma venda registrada</span>}
          </div>
        </div>

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
        <p className="text-gray-400 text-sm text-center py-8">Nenhuma movimentação neste mês</p>
      )}
    </div>
  )
}
