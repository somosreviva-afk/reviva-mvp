import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'
import { TrendingUp, ShoppingBag, Truck, TrendingDown, Settings, Package, Heart, BarChart2, Camera, AlertTriangle, Boxes, CheckCircle2, Send, DollarSign, CreditCard } from 'lucide-react'
import Link from 'next/link'

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

const STATUS_COLORS: Record<string, string> = {
  aguardando_fotos: 'bg-yellow-100 text-yellow-700',
  orcamento: 'bg-orange-100 text-orange-700',
  aprovado: 'bg-blue-100 text-blue-700',
  producao: 'bg-purple-100 text-purple-700',
  enviado: 'bg-blue-100 text-blue-800',
  finalizado: 'bg-green-100 text-green-700',
  entregue: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700',
}

function getDataInicio(periodo: Periodo): string {
  const hoje = new Date()
  switch (periodo) {
    case 'hoje':
      return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    case 'semana': {
      const d = new Date(hoje)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      d.setDate(diff)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
    case 'ano':
      return new Date(hoje.getFullYear(), 0, 1).toISOString()
    default:
      return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
  }
}

async function getDashboardData(empresaId: string, dataInicio: string) {
  const supabase = await createClient()

  // Pedidos do período (não cancelados)
  const { data: pedidosMes } = await supabase
    .from('pedidos')
    .select('id, valor_recebido, valor_total, frete_valor, custo_total_pedido, lucro_real, qtd_imas')
    .eq('empresa_id', empresaId)
    .neq('status', 'cancelado')
    .gte('created_at', dataInicio)

  const totalPedidosMes = (pedidosMes || []).length
  const faturamentoBruto = (pedidosMes || []).reduce((s, p) => s + Number(p.valor_total ?? 0), 0)
  const totalEntrou = (pedidosMes || []).reduce((s, p) => s + Number(p.valor_recebido ?? p.valor_total ?? 0), 0)
  const totalCorreio = (pedidosMes || []).reduce((s, p) => s + Number(p.frete_valor ?? 0), 0)
  const custoMaterialSalvo = (pedidosMes || []).reduce((s, p) => s + Number(p.custo_total_pedido ?? 0), 0)
  const lucroRealSalvo = (pedidosMes || []).reduce((s, p) => s + Number(p.lucro_real ?? 0), 0)
  const totalImas = (pedidosMes || []).reduce((s, p) => s + Number(p.qtd_imas ?? 0), 0)

  const margemPct = totalEntrou > 0 ? (lucroRealSalvo / totalEntrou) * 100 : 0

  // Pedidos por status — não filtrado por período (estado atual)
  const [
    { data: pedidosAbertos },
    { data: pedidosRecentes },
    { data: pedidosEnviados },
    { data: pedidosTransporte },
    { data: pedidosFinalizados },
  ] = await Promise.all([
    supabase.from('pedidos').select('id').eq('empresa_id', empresaId).in('status', ['aprovado', 'producao']),
    supabase.from('pedidos')
      .select('id, numero, status, valor_total, clientes(nome)')
      .eq('empresa_id', empresaId)
      .not('status', 'in', '(entregue,cancelado)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('pedidos').select('id').eq('empresa_id', empresaId).eq('status', 'producao'),
    supabase.from('pedidos').select('id').eq('empresa_id', empresaId).eq('status', 'enviado'),
    supabase.from('pedidos').select('id').eq('empresa_id', empresaId).eq('status', 'entregue'),
  ])

  // Estoque
  const { data: insumos } = await supabase
    .from('insumos')
    .select('nome, quantidade, estoque_minimo, unidade')
    .eq('empresa_id', empresaId)

  const insumosBaixos = (insumos || []).filter(
    (i: any) => Number(i.estoque_minimo) > 0 && Number(i.quantidade) < Number(i.estoque_minimo)
  )

  return {
    faturamento_bruto: faturamentoBruto,
    total_entrou: totalEntrou,
    custo_material: custoMaterialSalvo,
    total_correio: totalCorreio,
    lucro_real: lucroRealSalvo,
    margem_pct: margemPct,
    total_imas: totalImas,
    total_pedidos_mes: totalPedidosMes,
    pedidos_andamento: (pedidosAbertos || []).length,
    pedidos_producao: (pedidosEnviados || []).length,
    pedidos_enviados: (pedidosTransporte || []).length,
    pedidos_entregues: (pedidosFinalizados || []).length,
    pedidos_recentes: pedidosRecentes || [],
    total_insumos: (insumos || []).length,
    insumos_baixos: insumosBaixos,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>
}) {
  const params = await searchParams
  const periodo = (params.periodo || 'mes') as Periodo
  const dataInicio = getDataInicio(periodo)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, empresa_id')
    .eq('id', user!.id)
    .single()

  const dados = await getDashboardData(usuario!.empresa_id, dataInicio)
  const primeiroNome = usuario?.nome?.split(' ')[0] || 'Leticia'
  const hojeStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {primeiroNome}! 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{hojeStr}</p>
        </div>
        <Link href="/configuracoes" className="p-2 rounded-xl bg-white border border-gray-200">
          <Settings size={20} className="text-gray-500" />
        </Link>
      </div>

      {/* Filtro de período */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
        {PERIODOS.map(p => (
          <Link
            key={p.key}
            href={`/dashboard?periodo=${p.key}`}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
              periodo === p.key ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* Lucro Real — destaque */}
      <div className={`rounded-2xl p-5 border shadow-sm ${dados.lucro_real >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">💖 Lucro Real</p>
            <p className="text-[11px] text-gray-500">recebido − materiais − correio</p>
          </div>
          <p className={`text-2xl font-bold ${dados.lucro_real >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(dados.lucro_real)}
          </p>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <DollarSign size={18} className="text-blue-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">💰 Faturamento</p>
          <p className="text-lg font-bold text-blue-700">{formatCurrency(dados.faturamento_bruto)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">valor total das vendas</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center mb-3">
            <CreditCard size={18} className="text-green-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">💳 Recebido</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(dados.total_entrou)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">pix + link</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
            <Package size={18} className="text-orange-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">📦 Custos Material</p>
          <p className="text-lg font-bold text-orange-700">{formatCurrency(dados.custo_material)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">ímãs + impressão + embalagem</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
            <Truck size={18} className="text-purple-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">📮 Correio</p>
          <p className="text-lg font-bold text-purple-700">{formatCurrency(dados.total_correio)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">frete total</p>
        </div>
      </div>

      {/* Pedidos e margem */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
            <BarChart2 size={18} className="text-indigo-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">📈 Margem</p>
          <p className={`text-lg font-bold ${dados.margem_pct >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
            {dados.margem_pct.toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">sobre valor recebido</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
            <Camera size={18} className="text-teal-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">📸 Ímãs Vendidos</p>
          <p className="text-lg font-bold text-teal-700">{dados.total_imas}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{dados.total_pedidos_mes} pedidos</p>
        </div>
      </div>

      {/* Status dos Pedidos */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/pedidos" className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm block">
          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
            <Package size={15} className="text-purple-600" />
          </div>
          <p className="text-[10px] text-gray-500 mb-0.5">Em Producao</p>
          <p className="text-base font-bold text-purple-700">{dados.pedidos_producao}</p>
        </Link>
        <Link href="/pedidos" className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm block">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
            <Truck size={15} className="text-blue-600" />
          </div>
          <p className="text-[10px] text-gray-500 mb-0.5">Enviado</p>
          <p className="text-base font-bold text-blue-700">{dados.pedidos_enviados}</p>
        </Link>
        <Link href="/pedidos" className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm block">
          <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center mb-2">
            <CheckCircle2 size={15} className="text-green-600" />
          </div>
          <p className="text-[10px] text-gray-500 mb-0.5">Entregue</p>
          <p className="text-base font-bold text-green-700">{dados.pedidos_entregues}</p>
        </Link>
      </div>

      {/* Link para Relatórios */}
      <Link
        href="/relatorios"
        className="block bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <BarChart2 size={18} className="text-green-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">📊 Ver Relatórios Completos</p>
              <p className="text-xs text-gray-500">vendas, produtos, lucratividade</p>
            </div>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </div>
      </Link>

      {/* Estoque */}
      {dados.insumos_baixos.length > 0 && (
        <Link href="/estoque" className="block bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <p className="text-sm font-semibold text-orange-700">
              ⚠️ {dados.insumos_baixos.length} material(is) com estoque baixo
            </p>
          </div>
          <div className="space-y-0.5">
            {dados.insumos_baixos.slice(0, 3).map((i: any) => (
              <p key={i.nome} className="text-xs text-orange-600">
                • {i.nome}: {Number(i.quantidade).toFixed(0)} {i.unidade}
              </p>
            ))}
          </div>
          <p className="text-xs text-orange-500 mt-2 font-medium">Toque para ver estoque →</p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/estoque" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm block">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <Boxes size={18} className="text-amber-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">📦 Total Insumos</p>
          <p className="text-lg font-bold text-amber-700">{dados.total_insumos}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">tipos cadastrados</p>
        </Link>
        <Link href="/estoque" className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm block">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center mb-3">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">⚠️ Para Repor</p>
          <p className={`text-lg font-bold ${dados.insumos_baixos.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {dados.insumos_baixos.length}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {dados.insumos_baixos.length > 0 ? 'itens abaixo do mínimo' : 'tudo ok'}
          </p>
        </Link>
      </div>

      {/* Pedidos em aberto */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Pedidos em aberto</h2>
          <Link href="/pedidos" className="text-green-600 text-sm font-medium">Ver todos</Link>
        </div>
        {dados.pedidos_recentes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhum pedido em aberto</p>
        ) : (
          <div className="space-y-3">
            {dados.pedidos_recentes.map((pedido: any) => (
              <Link
                key={pedido.id}
                href={`/pedidos/${pedido.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{pedido.clientes?.nome}</p>
                  <p className="text-xs text-gray-500">#{pedido.numero} · {formatCurrency(pedido.valor_total)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[pedido.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[pedido.status] || pedido.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Ação rápida */}
      <Link
        href="/pedidos/novo"
        className="block w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-center text-base hover:bg-green-700 active:scale-95 transition-all"
      >
        + Novo Pedido
      </Link>

      <div className="pb-8" />
    </div>
  )
}
