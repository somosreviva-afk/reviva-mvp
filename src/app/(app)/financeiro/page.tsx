import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'
import { Plus, ChevronRight, ChevronLeft, ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, Building2 } from 'lucide-react'
import Link from 'next/link'

function urlMes(mes: number, ano: number) {
  return `/financeiro?mes=${mes}&ano=${ano}`
}

function nomeMes(mes: number, ano: number) {
  return new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function fmtData(iso: string) {
  return new Date(iso.substring(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

type Movimento = {
  key: string
  data: string        // ISO para ordenação
  dataDisplay: string
  descricao: string
  categoria: string
  tipo: 'entrada' | 'saida'
  valor: number
  saldoApos: number
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
  const fimMes    = new Date(anoSel, mesSel + 1, 1).toISOString().split('T')[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios').select('empresa_id').eq('id', user!.id).single()
  const empresaId = usuario!.empresa_id

  // ── CONTA (preparado para múltiplas) ─────────────────────────────
  const { data: contas } = await supabase
    .from('contas').select('id, nome').eq('empresa_id', empresaId).eq('ativo', true)
  const contaPrincipal = contas?.[0] ?? { id: null, nome: 'Conta Principal' }

  // ── TODOS OS DADOS (para saldo corrido e cards fixos) ────────────
  const [
    { data: todosPedidos },
    { data: todasCompras },
    { data: todasTransacoes },
  ] = await Promise.all([
    supabase.from('pedidos')
      .select('id, created_at, valor_recebido, valor_total, custo_total_pedido, tipo, forma_pagamento')
      .eq('empresa_id', empresaId).not('status', 'eq', 'cancelado')
      .order('created_at', { ascending: true }),
    supabase.from('movimentacoes_estoque')
      .select('id, data, valor_pago, insumos(nome)')
      .eq('empresa_id', empresaId).eq('tipo', 'entrada').not('valor_pago', 'is', null)
      .order('data', { ascending: true }),
    supabase.from('financeiro')
      .select('id, data, tipo, valor, descricao, categoria')
      .eq('empresa_id', empresaId)
      .order('data', { ascending: true }),
  ])

  // ── COMBINA E ORDENA TODAS AS MOVIMENTAÇÕES ────────────────────
  const raw: { key: string; data: string; descricao: string; categoria: string; tipo: 'entrada' | 'saida'; valor: number }[] = [
    ...(todosPedidos || []).filter(p => p.tipo !== 'mimo' && Number(p.valor_recebido || p.valor_total || 0) > 0).map(p => ({
      key: `p-${p.id}`,
      data: p.created_at,
      descricao: 'Venda',
      categoria: p.forma_pagamento
        ? `Venda · ${p.forma_pagamento.replace('_', ' ')}`
        : 'Venda',
      tipo: 'entrada' as const,
      valor: Number(p.valor_recebido || p.valor_total || 0),
    })),
    ...(todasCompras || []).map(c => ({
      key: `c-${c.id}`,
      data: c.data + 'T00:00:00.000Z',
      descricao: (c.insumos as any)?.nome ? `Compra: ${(c.insumos as any).nome}` : 'Compra de material',
      categoria: 'Compra de material',
      tipo: 'saida' as const,
      valor: Number(c.valor_pago || 0),
    })),
    ...(todasTransacoes || []).map(t => ({
      key: `f-${t.id}`,
      data: t.data + 'T00:00:00.000Z',
      descricao: t.descricao || (t.tipo === 'entrada' ? 'Entrada' : 'Saída'),
      categoria: t.categoria || (t.tipo === 'entrada' ? 'Outras entradas' : 'Outras despesas'),
      tipo: t.tipo as 'entrada' | 'saida',
      valor: Number(t.valor || 0),
    })),
  ]

  raw.sort((a, b) => a.data.localeCompare(b.data))

  // Calcula saldo corrido
  let saldoCorrido = 0
  const allMovimentos: Movimento[] = raw.map(m => {
    saldoCorrido += m.tipo === 'entrada' ? m.valor : -m.valor
    return { ...m, dataDisplay: fmtData(m.data), saldoApos: saldoCorrido }
  })

  // Saldo em Conta = último saldo do corrido
  const saldoConta = saldoCorrido

  // ── CARDS FIXOS ──────────────────────────────────────────────────
  const receitaGeral   = raw.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0)
  const saidasGeral    = raw.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0)
  const custoProdGeral = (todosPedidos || []).reduce((s, p) => s + Number(p.custo_total_pedido || 0), 0)
  const saidasManuaisGeral = (todasTransacoes || []).filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0)
  const lucroAcumulado = receitaGeral - custoProdGeral - saidasManuaisGeral

  // ── MÊS SELECIONADO ──────────────────────────────────────────────
  const movimentosMes = allMovimentos.filter(m => {
    const d = m.data.substring(0, 10)
    return d >= inicioMes && d < fimMes
  })

  // Saldo no início do mês
  const saldoInicioMes = allMovimentos
    .filter(m => m.data.substring(0, 10) < inicioMes)
    .at(-1)?.saldoApos ?? 0

  // Resultado do mês
  const receitaMes   = movimentosMes.filter(m => m.tipo === 'entrada' && m.categoria.startsWith('Venda')).reduce((s, m) => s + m.valor, 0)
  const entradasMes  = movimentosMes.filter(m => m.tipo === 'entrada' && !m.categoria.startsWith('Venda')).reduce((s, m) => s + m.valor, 0)
  const pedidosMesIds = movimentosMes.filter(m => m.key.startsWith('p-')).map(m => m.key.replace('p-', ''))
  const custoProdMes = (todosPedidos || [])
    .filter(p => pedidosMesIds.includes(p.id))
    .reduce((s, p) => s + Number(p.custo_total_pedido || 0), 0)
  const saidasMes    = movimentosMes.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0)
  const lucroMes     = receitaMes + entradasMes - custoProdMes - saidasMes
  const margemMes    = receitaMes > 0 ? Math.round((lucroMes / receitaMes) * 100) : 0

  return (
    <div className="p-4 pb-24">
      <div className="pt-4 mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-xs text-gray-400 mt-0.5">Saldo real e resultado contábil</p>
        </div>
        {/* Seletor de conta — pronto para múltiplas */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <Building2 size={13} className="text-[#b5005e]" />
          <span className="text-xs font-semibold text-gray-700">{contaPrincipal.nome}</span>
        </div>
      </div>

      {/* ── SALDO EM CONTA ───────────────────────────────────────────── */}
      <div className={`rounded-2xl p-5 mb-3 ${saldoConta >= 0 ? 'bg-[#b5005e]' : 'bg-red-600'}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-pink-200 font-medium uppercase tracking-widest">Saldo em Conta</p>
            <p className="text-4xl font-bold text-white mt-1">{formatCurrency(saldoConta)}</p>
            <p className="text-[10px] text-pink-300 mt-1">valor exato que deve existir na conta · não muda ao trocar o mês</p>
          </div>
          <Wallet size={26} className="text-pink-300" />
        </div>
        <div className="flex gap-6 pt-3 border-t border-white/20">
          <div>
            <p className="text-[10px] text-pink-300">Total de entradas</p>
            <p className="text-sm font-bold text-white">{formatCurrency(receitaGeral)}</p>
          </div>
          <div>
            <p className="text-[10px] text-pink-300">Total de saídas</p>
            <p className="text-sm font-bold text-pink-200">{formatCurrency(saidasGeral)}</p>
          </div>
        </div>
      </div>

      {/* ── LUCRO ACUMULADO ──────────────────────────────────────────── */}
      <div className={`rounded-2xl p-4 mb-5 border ${lucroAcumulado >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Lucro Acumulado (contábil)</p>
            <p className={`text-2xl font-bold mt-0.5 ${lucroAcumulado >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(lucroAcumulado)}
            </p>
          </div>
          <TrendingUp size={22} className={lucroAcumulado >= 0 ? 'text-green-400' : 'text-red-400'} />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">receitas − custo dos produtos − despesas · valor contábil</p>
      </div>

      {/* ── NAVEGAÇÃO DE MESES ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <Link href={urlMes(mesPrev, anoPrev)}
          className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
          <ChevronLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm py-2.5 px-3 text-center">
          <p className="text-sm font-semibold text-gray-800 capitalize">{nomeMes(mesSel, anoSel)}</p>
          {ehMesAtual && <p className="text-[10px] text-[#b5005e]">mês atual</p>}
        </div>
        <Link href={urlMes(mesNext, anoNext)}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-sm ${
            ehMesAtual ? 'bg-gray-50 border-gray-100 pointer-events-none opacity-30' : 'bg-white border-gray-200'
          }`}>
          <ChevronRight size={18} className="text-gray-600" />
        </Link>
      </div>

      {/* ── RESULTADO DO MÊS ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Resultado do mês</h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Receita de vendas</span>
            <span className="font-semibold text-green-700">+{formatCurrency(receitaMes)}</span>
          </div>
          {entradasMes > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Outras entradas</span>
              <span className="font-semibold text-teal-600">+{formatCurrency(entradasMes)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Custo dos produtos</span>
            <span className="font-semibold text-orange-600">−{formatCurrency(custoProdMes)}</span>
          </div>
          {saidasMes > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Saídas do período</span>
              <span className="font-semibold text-red-600">−{formatCurrency(saidasMes)}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2.5 space-y-1">
            <div className="flex justify-between font-bold">
              <span className="text-gray-900">Lucro do mês</span>
              <span className={lucroMes >= 0 ? 'text-green-700' : 'text-red-600'}>{formatCurrency(lucroMes)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Margem</span>
              <span className={`font-semibold ${margemMes >= 0 ? 'text-green-600' : 'text-red-500'}`}>{margemMes}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FLUXO DE CAIXA ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Fluxo de caixa</h2>
          <span className="text-xs text-gray-400">{movimentosMes.length} movimentações</span>
        </div>

        {/* Saldo inicial do mês */}
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-500 font-medium">Saldo no início do mês</span>
          <span className="text-xs font-bold text-gray-700">{formatCurrency(saldoInicioMes)}</span>
        </div>

        {movimentosMes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhuma movimentação neste mês</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {movimentosMes.map(m => (
              <div key={m.key} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.tipo === 'entrada'
                      ? <ArrowUpCircle size={15} className="text-green-500 shrink-0" />
                      : <ArrowDownCircle size={15} className="text-red-400 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{m.descricao}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">{m.dataDisplay}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{m.categoria}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-sm font-bold ${m.tipo === 'entrada' ? 'text-green-700' : 'text-red-600'}`}>
                      {m.tipo === 'entrada' ? '+' : '−'}{formatCurrency(m.valor)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">saldo {formatCurrency(m.saldoApos)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Saldo final do mês */}
        {movimentosMes.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-600 font-semibold">Saldo no fim do mês</span>
            <span className={`text-sm font-bold ${(movimentosMes.at(-1)?.saldoApos ?? 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(movimentosMes.at(-1)?.saldoApos ?? 0)}
            </span>
          </div>
        )}
      </div>

      {/* ── BOTÕES ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/financeiro/nova-entrada"
          className="flex items-center justify-center gap-2 bg-green-100 text-green-700 py-3 rounded-xl font-medium text-sm">
          <Plus size={16} /> Entrada
        </Link>
        <Link href="/financeiro/nova-saida"
          className="flex items-center justify-center gap-2 bg-red-100 text-red-600 py-3 rounded-xl font-medium text-sm">
          <Plus size={16} /> Saída
        </Link>
      </div>
    </div>
  )
}
