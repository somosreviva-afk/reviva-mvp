import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'
import { calcularConsumo } from '@/lib/utils/estoque'
import {
  Settings, ChevronLeft, ChevronRight, AlertTriangle,
  Package, Camera, Truck, DollarSign,
  Calendar, Zap, BarChart2, Clock, ShoppingBag, Boxes,
} from 'lucide-react'
import Link from 'next/link'

// ── constantes ─────────────────────────────────────────────────────────
type Periodo = 'hoje' | 'semana' | 'mes' | 'ano'
const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
]
const STATUS_LABELS: Record<string, string> = {
  aguardando_fotos: 'Aguardando Fotos',
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  producao: 'Em Produção',
  enviado: 'Enviado',
  finalizado: 'Finalizado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}
const STATUS_CORES: Record<string, string> = {
  aguardando_fotos: 'bg-yellow-100 text-yellow-700',
  orcamento:        'bg-orange-100 text-orange-700',
  aprovado:         'bg-blue-100 text-blue-700',
  producao:         'bg-purple-100 text-purple-700',
  enviado:          'bg-blue-100 text-blue-800',
  finalizado:       'bg-green-100 text-green-700',
  entregue:         'bg-gray-100 text-gray-700',
  cancelado:        'bg-red-100 text-red-700',
}
const STATUS_ATIVOS = ['orcamento', 'aprovado', 'aguardando_fotos', 'producao', 'enviado', 'finalizado']

// ── helpers ────────────────────────────────────────────────────────────
function getDatasDoFiltro(periodo: Periodo, mes: number, ano: number) {
  const hoje = new Date()
  switch (periodo) {
    case 'hoje': {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      return { inicio: d.toISOString(), fim: new Date(d.getTime() + 86400000).toISOString() }
    }
    case 'semana': {
      const d = new Date(hoje)
      const day = d.getDay()
      d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
      d.setHours(0, 0, 0, 0)
      return { inicio: d.toISOString(), fim: null }
    }
    case 'mes':
      return {
        inicio: new Date(ano, mes, 1).toISOString(),
        fim:    new Date(ano, mes + 1, 1).toISOString(),
      }
    case 'ano':
      return { inicio: new Date(hoje.getFullYear(), 0, 1).toISOString(), fim: null }
    default:
      return { inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString(), fim: null }
  }
}
function nomeMes(mes: number, ano: number) {
  return new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
function urlMes(mes: number, ano: number) {
  return `/dashboard?periodo=mes&mes=${mes}&ano=${ano}`
}
function fmtData(d: string) {
  return new Date(d.substring(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function diasAtras(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

// ── busca de dados ─────────────────────────────────────────────────────
async function getData(empresaId: string, inicio: string, fim: string | null) {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const fimMes    = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0]

  // ── todos os dados financeiros (para saldo e lucro acumulado) ──────
  const [
    { data: todosPedidos },
    { data: todasCompras },
    { data: todasTransacoes },
    { data: todosCustosProducao },
  ] = await Promise.all([
    supabase.from('pedidos')
      .select('id, numero, created_at, valor_recebido, valor_total, custo_total_pedido, tipo, forma_pagamento, status, qtd_imas, data_entrega, clientes(nome)')
      .eq('empresa_id', empresaId)
      .neq('status', 'cancelado')
      .order('created_at', { ascending: true }),
    supabase.from('movimentacoes_estoque')
      .select('id, data, valor_pago, insumos(nome)')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'entrada')
      .not('valor_pago', 'is', null)
      .order('data', { ascending: true }),
    supabase.from('financeiro')
      .select('id, data, tipo, valor, descricao, categoria')
      .eq('empresa_id', empresaId)
      .order('data', { ascending: true }),
    supabase.from('custos_producao')
      .select('id, data, descricao, valor, pedido_id')
      .eq('empresa_id', empresaId)
      .order('data', { ascending: true }),
  ])

  // ── meta de recuperação e configurações ─────────────────────────────
  const { data: cfg } = await supabase
    .from('configuracoes_materiais')
    .select('investimento_inicial, fotos_por_folha')
    .eq('empresa_id', empresaId)
    .single()
  const investimentoInicial = Number(cfg?.investimento_inicial ?? 0)
  const fotosPerFolha = Number(cfg?.fotos_por_folha ?? 12)

  // ── pedidos por status e alertas ────────────────────────────────────
  const [
    { data: pedidosStatus },
    { data: insumosAll },
    { data: eventoProximo },
    { data: eventosMes },
    { data: receitaEventosMes },
  ] = await Promise.all([
    supabase.from('pedidos')
      .select('id, numero, status, data_entrega, created_at, clientes(nome)')
      .eq('empresa_id', empresaId)
      .in('status', STATUS_ATIVOS)
      .order('created_at', { ascending: false }),
    supabase.from('insumos')
      .select('nome, quantidade, estoque_minimo, unidade, custo_unitario, tipo')
      .eq('empresa_id', empresaId),
    supabase.from('eventos')
      .select('id, nome, data_evento, status, valor_contrato')
      .eq('empresa_id', empresaId)
      .eq('status', 'confirmado')
      .gte('data_evento', hoje)
      .order('data_evento', { ascending: true })
      .limit(1),
    supabase.from('eventos')
      .select('id')
      .eq('empresa_id', empresaId)
      .gte('data_evento', inicioMes)
      .lte('data_evento', fimMes),
    supabase.from('eventos_financeiro')
      .select('valor')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'receita')
      .gte('data_lancamento', inicioMes)
      .lte('data_lancamento', fimMes),
  ])

  // ── cálculos financeiros ─────────────────────────────────────────────
  const pedidosVenda = (todosPedidos || []).filter(p => p.tipo !== 'mimo')
  const receitaTotal   = pedidosVenda.reduce((s, p) => s + Number(p.valor_recebido ?? p.valor_total ?? 0), 0)
  const custosMatTotal = pedidosVenda.reduce((s, p) => s + Number(p.custo_total_pedido ?? 0), 0)
  const saidasFinTotal = (todasTransacoes || []).filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0)
  const entradasFinTotal = (todasTransacoes || []).filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0)
  const comprasEstTotal  = (todasCompras || []).reduce((s, c) => s + Number(c.valor_pago ?? 0), 0)
  const custoProdTotal   = (todosCustosProducao || []).reduce((s, c) => s + Number(c.valor), 0)

  // Saldo em Conta = tudo que entrou − tudo que saiu (caixa real)
  const saldoConta = receitaTotal + entradasFinTotal - saidasFinTotal - comprasEstTotal - custoProdTotal

  // Lucro Acumulado = receita − custo material − saídas financeiras − custos produção
  const lucroAcumulado = receitaTotal - custosMatTotal - saidasFinTotal - custoProdTotal

  // Meta de recuperação
  const faltaRecuperar  = Math.max(0, investimentoInicial - receitaTotal)
  const pctRecuperado   = investimentoInicial > 0 ? Math.min(100, (receitaTotal / investimentoInicial) * 100) : 100

  // ── período selecionado ─────────────────────────────────────────────
  const pedidosPeriodo = (todosPedidos || []).filter(p => {
    if (!p) return false
    const d = new Date(p.created_at)
    const ini = new Date(inicio)
    if (d < ini) return false
    if (fim && d >= new Date(fim)) return false
    return true
  })
  const receitaMes  = pedidosPeriodo.filter(p => p.tipo !== 'mimo').reduce((s, p) => s + Number(p.valor_recebido ?? p.valor_total ?? 0), 0)
  const custosMes   = pedidosPeriodo.reduce((s, p) => s + Number(p.custo_total_pedido ?? 0), 0)
  const custoProdMes = (todosCustosProducao || []).filter(c => {
    const d = c.data
    return d >= inicio.split('T')[0] && (!fim || d < fim.split('T')[0])
  }).reduce((s, c) => s + Number(c.valor), 0)
  const lucroMes    = receitaMes - custosMes - custoProdMes
  const totalImasMes = pedidosPeriodo.reduce((s, p) => s + Number(p.qtd_imas ?? 0), 0)

  // ── operação atual ──────────────────────────────────────────────────
  const ativos           = pedidosStatus || []
  const ctAguardando     = ativos.filter(p => p.status === 'aguardando_fotos').length
  const ctProducao       = ativos.filter(p => p.status === 'producao').length
  const ctEnviado        = ativos.filter(p => p.status === 'enviado').length
  const ctAtrasados      = ativos.filter(p => {
    if (!p.data_entrega) return false
    return new Date(p.data_entrega + 'T23:59:59') < new Date()
  }).length
  const totalAtivos      = ativos.length

  // ── alertas ─────────────────────────────────────────────────────────
  const pedidosAtrasados  = ativos.filter(p => p.data_entrega && new Date(p.data_entrega + 'T23:59:59') < new Date())
  const pedidosFotosDias  = ativos.filter(p => p.status === 'aguardando_fotos' && diasAtras(p.created_at) >= 3)
  const insumosCriticos   = (insumosAll || []).filter(i => {
    const qtd = Number(i.quantidade); const min = Number(i.estoque_minimo)
    return qtd === 0 || (min > 0 && qtd < min * 0.5)
  })
  // baixo = entre 50% e 100% do mínimo (não se sobrepõe com crítico)
  const insumosLow        = (insumosAll || []).filter(i => {
    const qtd = Number(i.quantidade); const min = Number(i.estoque_minimo)
    return min > 0 && qtd >= min * 0.5 && qtd < min
  })

  // ── estoque ─────────────────────────────────────────────────────────
  const valorEstoque = (insumosAll || []).reduce((s, i) => s + Number(i.quantidade ?? 0) * Number(i.custo_unitario ?? 0), 0)

  // capacidade: mínimo com 6 ímãs (kit mais comum) usando fotos_por_folha real
  const consumoKit6 = calcularConsumo(6, fotosPerFolha)
  const insumoMap = Object.fromEntries((insumosAll || []).map(i => [i.tipo, i]))
  const capacidade6 = Math.min(
    ...Object.entries(consumoKit6).map(([tipo, qtd]) =>
      qtd > 0 ? Math.floor(Number(insumoMap[tipo]?.quantidade ?? 0) / qtd) : Infinity
    ).filter(v => v !== Infinity)
  )

  // ── atividades recentes (timeline) ──────────────────────────────────
  type Atividade = { key: string; data: string; tipo: 'pedido' | 'financeiro' | 'estoque' | 'custo'; descricao: string; sub?: string; link?: string }
  const atividades: Atividade[] = [
    // pedidos criados recentemente
    ...(todosPedidos || []).slice(-10).reverse().map(p => ({
      key: `p-${p.id}`,
      data: p.created_at,
      tipo: 'pedido' as const,
      descricao: `Pedido #${p.numero} — ${(p.clientes as any)?.nome ?? ''}`,
      sub: STATUS_LABELS[p.status] || p.status,
      link: `/pedidos/${p.id}`,
    })),
    // entradas financeiras
    ...(todasTransacoes || []).slice(-8).reverse().map(t => ({
      key: `f-${t.id}`,
      data: t.data + 'T12:00:00',
      tipo: 'financeiro' as const,
      descricao: t.descricao || (t.tipo === 'entrada' ? 'Entrada' : 'Saída'),
      sub: `${t.tipo === 'entrada' ? '+' : '−'} ${formatCurrency(Number(t.valor))}`,
      link: '/financeiro',
    })),
    // compras de estoque
    ...(todasCompras || []).slice(-5).reverse().map(c => ({
      key: `e-${c.id}`,
      data: c.data + 'T12:00:00',
      tipo: 'estoque' as const,
      descricao: `Entrada: ${(c.insumos as any)?.nome ?? 'material'}`,
      sub: c.valor_pago ? `${formatCurrency(Number(c.valor_pago))}` : undefined,
      link: '/estoque',
    })),
    // custos de produção
    ...(todosCustosProducao || []).slice(-5).reverse().map(c => ({
      key: `cp-${c.id}`,
      data: c.data + 'T12:00:00',
      tipo: 'custo' as const,
      descricao: `Custo: ${c.descricao}`,
      sub: `−${formatCurrency(Number(c.valor))}`,
    })),
  ]
  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  .slice(0, 10)

  return {
    // financeiro
    saldoConta, lucroAcumulado, receitaMes, lucroMes,
    totalImasMes, totalPedidosMes: pedidosPeriodo.length,
    // meta
    investimentoInicial, faltaRecuperar, pctRecuperado, receitaTotal,
    // operação
    ctAguardando, ctProducao, ctEnviado, ctAtrasados, totalAtivos,
    pedidosAtrasados, pedidosFotosDias,
    // alertas
    insumosCriticos, insumosLow,
    // produção (últimos pedidos ativos)
    pedidosAtivos: ativos.slice(0, 5),
    // estoque
    valorEstoque, capacidade6,
    totalInsumos: (insumosAll || []).length,
    // eventos
    eventoProximo: eventoProximo?.[0] ?? null,
    qtdEventosMes: (eventosMes || []).length,
    receitaEventosMes: (receitaEventosMes || []).reduce((s, r) => s + Number(r.valor), 0),
    // timeline
    atividades,
  }
}

// ── página ─────────────────────────────────────────────────────────────
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; mes?: string; ano?: string }>
}) {
  const params    = await searchParams
  const periodo   = (params.periodo || 'mes') as Periodo
  const hoje      = new Date()
  const mesAtual  = hoje.getMonth()
  const anoAtual  = hoje.getFullYear()
  const mesSel    = params.mes  !== undefined ? parseInt(params.mes)  : mesAtual
  const anoSel    = params.ano  !== undefined ? parseInt(params.ano)  : anoAtual
  const ehMesAtual = mesSel === mesAtual && anoSel === anoAtual
  const mesPrev   = mesSel === 0  ? 11 : mesSel - 1
  const anoPrev   = mesSel === 0  ? anoSel - 1 : anoSel
  const mesNext   = mesSel === 11 ? 0  : mesSel + 1
  const anoNext   = mesSel === 11 ? anoSel + 1 : anoSel

  const { inicio, fim } = getDatasDoFiltro(periodo, mesSel, anoSel)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario }  = await supabase.from('usuarios').select('nome, empresa_id').eq('id', user!.id).single()

  const d = await getData(usuario!.empresa_id, inicio, fim)
  const primeiroNome = usuario?.nome?.split(' ')[0] || 'Ana'
  const hojeStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const temAlertas = d.pedidosAtrasados.length > 0 || d.insumosCriticos.length > 0 || d.pedidosFotosDias.length > 0

  return (
    <div className="p-4 pb-28 space-y-4">

      {/* ── CABEÇALHO ── */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {primeiroNome}! 👋</h1>
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{hojeStr}</p>
        </div>
        <Link href="/configuracoes" className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
          <Settings size={18} className="text-gray-500" />
        </Link>
      </div>

      {/* ── META DE RECUPERAÇÃO ── */}
      {d.investimentoInicial > 0 && (
        d.faltaRecuperar === 0 ? (
          <div className="bg-green-600 rounded-2xl p-5 text-white shadow-sm shadow-green-200">
            <p className="text-green-200 text-sm mb-0.5">Meta atingida! 🎉</p>
            <p className="text-2xl font-bold">Vocês estão lucrando!</p>
            <p className="text-green-200 text-xs mt-1">
              Investimento de {formatCurrency(d.investimentoInicial)} recuperado
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Meta atual</p>
                <p className="text-sm font-bold text-gray-900">Recuperar investimento</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-orange-600">{formatCurrency(d.faltaRecuperar)}</p>
                <p className="text-[10px] text-gray-400">ainda falta</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1.5">
              <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${d.pctRecuperado}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{formatCurrency(d.receitaTotal)} recuperado</span>
              <span>{d.pctRecuperado.toFixed(0)}%</span>
            </div>
          </div>
        )
      )}

      {/* ── FILTRO DE PERÍODO ── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
        {PERIODOS.map(p => (
          <Link
            key={p.key}
            href={p.key === 'mes' ? urlMes(mesAtual, anoAtual) : `/dashboard?periodo=${p.key}`}
            className={`flex-1 py-2 rounded-lg text-xs font-bold text-center transition-all ${
              periodo === p.key ? 'bg-white text-[#b5005e] shadow-sm' : 'text-gray-500'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Navegação de meses */}
      {periodo === 'mes' && (
        <div className="flex items-center gap-2">
          <Link href={urlMes(mesPrev, anoPrev)} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm py-2 px-3 text-center">
            <p className="text-sm font-bold text-gray-800 capitalize">{nomeMes(mesSel, anoSel)}</p>
            {ehMesAtual && <p className="text-[10px] text-green-600">mês atual</p>}
          </div>
          <Link
            href={urlMes(mesNext, anoNext)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm active:scale-95 transition-all ${
              ehMesAtual ? 'bg-gray-50 border-gray-100 pointer-events-none opacity-30' : 'bg-white border-gray-200'
            }`}
          >
            <ChevronRight size={18} className="text-gray-600" />
          </Link>
        </div>
      )}

      {/* ── ⚠️ ALERTAS ── */}
      {temAlertas && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={15} className="text-red-500 shrink-0" />
            <p className="text-sm font-bold text-red-700">Atenção necessária</p>
          </div>

          {d.pedidosAtrasados.map((p: any) => (
            <Link key={p.id} href={`/pedidos/${p.id}`} className="flex items-center gap-2 text-xs text-red-700 hover:text-red-900 group">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="flex-1">Pedido <strong>#{p.numero}</strong> ({(p.clientes as any)?.nome}) — prazo vencido</span>
              <ChevronRight size={11} className="text-red-400" />
            </Link>
          ))}

          {d.insumosCriticos.map((i: any) => (
            <Link key={i.nome} href="/estoque" className="flex items-center gap-2 text-xs text-red-700">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="flex-1">Estoque crítico: <strong>{i.nome}</strong> — {Number(i.quantidade).toFixed(0)} {i.unidade}</span>
              <ChevronRight size={11} className="text-red-400" />
            </Link>
          ))}

          {d.pedidosFotosDias.map((p: any) => (
            <Link key={`f${p.id}`} href={`/pedidos/${p.id}`} className="flex items-center gap-2 text-xs text-orange-700">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <span className="flex-1">Pedido <strong>#{p.numero}</strong> aguardando fotos há {diasAtras(p.created_at)} dias</span>
              <ChevronRight size={11} className="text-orange-400" />
            </Link>
          ))}
        </div>
      )}

      {/* ── 💰 FINANCEIRO ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5 px-1">💰 Financeiro</p>

        {/* Saldo e Lucro em destaque */}
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <div className={`rounded-2xl p-4 border shadow-sm ${d.saldoConta >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Saldo em Conta</p>
            <p className={`text-2xl font-bold ${d.saldoConta >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(d.saldoConta)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">caixa real</p>
          </div>
          <div className={`rounded-2xl p-4 border shadow-sm ${d.lucroAcumulado >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Lucro Acumulado</p>
            <p className={`text-2xl font-bold ${d.lucroAcumulado >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {formatCurrency(d.lucroAcumulado)}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">total geral</p>
          </div>
        </div>

        {/* Período selecionado */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Receita do período</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(d.receitaMes)}</p>
            <p className="text-[10px] text-gray-400">{d.totalPedidosMes} pedido{d.totalPedidosMes !== 1 ? 's' : ''} · {d.totalImasMes} ímãs</p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-4 ${d.lucroMes >= 0 ? 'bg-white border-gray-100' : 'bg-red-50 border-red-100'}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Resultado do período</p>
            <p className={`text-xl font-bold ${d.lucroMes >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(d.lucroMes)}
            </p>
            <p className="text-[10px] text-gray-400">
              {d.receitaMes > 0 ? `margem ${Math.round((d.lucroMes / d.receitaMes) * 100)}%` : '—'}
            </p>
          </div>
        </div>

        <Link href="/financeiro" className="mt-2.5 flex items-center justify-end gap-1 text-xs text-[#b5005e] font-semibold px-1">
          Ver fluxo de caixa <ChevronRight size={13} />
        </Link>
      </div>

      {/* ── 📦 OPERAÇÃO ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">📦 Operação</p>
          <span className="text-xs text-gray-400">{d.totalAtivos} ativo{d.totalAtivos !== 1 ? 's' : ''}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/pedidos?filtroStatus=aguardando_fotos" className={`rounded-2xl border p-4 shadow-sm transition-all active:scale-95 ${d.ctAguardando > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-1">
              <Camera size={16} className={d.ctAguardando > 0 ? 'text-yellow-600' : 'text-gray-400'} />
              <ChevronRight size={13} className="text-gray-300" />
            </div>
            <p className={`text-3xl font-bold ${d.ctAguardando > 0 ? 'text-yellow-700' : 'text-gray-400'}`}>{d.ctAguardando}</p>
            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Ag. Fotos</p>
          </Link>
          <Link href="/pedidos?filtroStatus=producao" className={`rounded-2xl border p-4 shadow-sm transition-all active:scale-95 ${d.ctProducao > 0 ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-1">
              <Package size={16} className={d.ctProducao > 0 ? 'text-purple-600' : 'text-gray-400'} />
              <ChevronRight size={13} className="text-gray-300" />
            </div>
            <p className={`text-3xl font-bold ${d.ctProducao > 0 ? 'text-purple-700' : 'text-gray-400'}`}>{d.ctProducao}</p>
            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Em Produção</p>
          </Link>
          <Link href="/pedidos?filtroStatus=enviado" className={`rounded-2xl border p-4 shadow-sm transition-all active:scale-95 ${d.ctEnviado > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-1">
              <Truck size={16} className={d.ctEnviado > 0 ? 'text-blue-600' : 'text-gray-400'} />
              <ChevronRight size={13} className="text-gray-300" />
            </div>
            <p className={`text-3xl font-bold ${d.ctEnviado > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{d.ctEnviado}</p>
            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Enviados</p>
          </Link>
          <Link href="/pedidos" className={`rounded-2xl border p-4 shadow-sm transition-all active:scale-95 ${d.ctAtrasados > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between mb-1">
              <Clock size={16} className={d.ctAtrasados > 0 ? 'text-red-500' : 'text-gray-400'} />
              <ChevronRight size={13} className="text-gray-300" />
            </div>
            <p className={`text-3xl font-bold ${d.ctAtrasados > 0 ? 'text-red-600' : 'text-gray-400'}`}>{d.ctAtrasados}</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${d.ctAtrasados > 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {d.ctAtrasados > 0 ? '⚠ Atrasados' : 'Atrasados'}
            </p>
          </Link>
        </div>

        {/* Pedidos ativos (resumo rápido) */}
        {d.pedidosAtivos.length > 0 && (
          <div className="mt-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pedidos ativos</p>
              <Link href="/pedidos" className="text-xs text-[#b5005e] font-semibold">Ver todos</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {d.pedidosAtivos.map((p: any) => (
                <Link key={p.id} href={`/pedidos/${p.id}`} className="flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{(p.clientes as any)?.nome}</p>
                    <p className="text-xs text-gray-400">#{p.numero}{p.data_entrega ? ` · ${fmtData(p.data_entrega)}` : ''}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 📦 ESTOQUE ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5 px-1">📦 Estoque</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-gray-50">
            <div className="p-4 text-center">
              <p className={`text-2xl font-bold ${d.insumosCriticos.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {d.insumosCriticos.length}
              </p>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Crítico{d.insumosCriticos.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-bold text-gray-900">{formatCurrency(d.valorEstoque)}</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Investido</p>
            </div>
            <div className="p-4 text-center">
              <p className={`text-2xl font-bold ${d.capacidade6 === 0 ? 'text-red-600' : d.capacidade6 < 5 ? 'text-yellow-600' : 'text-green-700'}`}>
                {isFinite(d.capacidade6) ? d.capacidade6 : '—'}
              </p>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Kits 6 ímãs</p>
            </div>
          </div>
          {(d.insumosCriticos.length > 0 || d.insumosLow.length > 0) && (
            <div className="px-4 pb-3 pt-1 space-y-1 border-t border-gray-50">
              {[...d.insumosCriticos.slice(0, 2), ...d.insumosLow.slice(0, 1)].map((i: any) => (
                <p key={i.nome} className="text-xs text-gray-500">
                  {d.insumosCriticos.includes(i) ? '🔴' : '🟡'} {i.nome}: {Number(i.quantidade).toFixed(0)} {i.unidade}
                </p>
              ))}
            </div>
          )}
          <Link href="/estoque" className="flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-50 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
            <Boxes size={13} /> Abrir Estoque
          </Link>
        </div>
      </div>

      {/* ── 🎉 EVENTOS ── */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5 px-1">🎉 Eventos</p>
        {d.qtdEventosMes > 0 || d.eventoProximo ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {d.eventoProximo && (
              <div className="p-4 bg-purple-50 border-b border-purple-100">
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wide mb-1">Próximo evento</p>
                <p className="font-bold text-purple-900">{d.eventoProximo.nome}</p>
                <p className="text-xs text-purple-600">
                  {new Date(d.eventoProximo.data_evento + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                  {d.eventoProximo.valor_contrato ? ` · ${formatCurrency(Number(d.eventoProximo.valor_contrato))}` : ''}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 divide-x divide-gray-50">
              <div className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-700">{d.qtdEventosMes}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Este mês</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-sm font-bold text-purple-700">{formatCurrency(d.receitaEventosMes)}</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Receita do mês</p>
              </div>
            </div>
            <Link href="/eventos" className="flex items-center justify-center gap-1.5 py-2.5 border-t border-gray-50 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors">
              <Calendar size={13} /> Abrir Eventos
            </Link>
          </div>
        ) : (
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 text-center">
            <Calendar size={32} className="mx-auto text-purple-300 mb-2" />
            <p className="text-sm font-semibold text-purple-700 mb-0.5">Nenhum evento confirmado</p>
            <p className="text-xs text-purple-500 mb-3">Cadastre eventos para ver o resumo aqui</p>
            <Link href="/eventos" className="inline-flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
              <Calendar size={13} /> Abrir Eventos
            </Link>
          </div>
        )}
      </div>

      {/* ── 📝 ATIVIDADES RECENTES ── */}
      {d.atividades.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5 px-1">📝 Atividades Recentes</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-50">
              {d.atividades.map((a) => {
                const icone = a.tipo === 'pedido' ? (
                  <ShoppingBag size={14} className="text-[#b5005e]" />
                ) : a.tipo === 'financeiro' ? (
                  <DollarSign size={14} className="text-green-600" />
                ) : a.tipo === 'estoque' ? (
                  <Package size={14} className="text-orange-500" />
                ) : (
                  <Zap size={14} className="text-purple-500" />
                )

                const fundo = {
                  pedido:     'bg-pink-50',
                  financeiro: 'bg-green-50',
                  estoque:    'bg-orange-50',
                  custo:      'bg-purple-50',
                }[a.tipo]

                const inner = (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${fundo}`}>
                      {icone}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium leading-tight truncate">{a.descricao}</p>
                      <p className="text-xs text-gray-400">
                        {fmtData(a.data)}{a.sub ? ` · ${a.sub}` : ''}
                      </p>
                    </div>
                    {a.link && <ChevronRight size={13} className="text-gray-300 shrink-0" />}
                  </div>
                )

                return a.link ? (
                  <Link key={a.key} href={a.link} className="block active:bg-gray-50 transition-colors">
                    {inner}
                  </Link>
                ) : (
                  <div key={a.key}>{inner}</div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── AÇÃO RÁPIDA ── */}
      <Link
        href="/pedidos/novo"
        className="block w-full bg-[#b5005e] text-white py-4 rounded-2xl font-bold text-center text-base active:scale-95 transition-all shadow-sm shadow-pink-200"
      >
        + Novo Pedido
      </Link>

      <Link href="/relatorios" className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4 shadow-sm active:scale-95 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <BarChart2 size={18} className="text-green-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Relatórios</p>
            <p className="text-xs text-gray-400">vendas, produtos, lucratividade</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-400" />
      </Link>
    </div>
  )
}
