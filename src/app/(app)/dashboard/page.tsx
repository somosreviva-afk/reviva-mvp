import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'
import { TrendingUp, ShoppingBag, Truck, TrendingDown, Settings, Package, Heart, BarChart2, Camera } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  producao: 'Produção',
  finalizado: 'Finalizado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  orcamento: 'bg-orange-100 text-orange-700',
  aprovado: 'bg-blue-100 text-blue-700',
  producao: 'bg-yellow-100 text-yellow-700',
  finalizado: 'bg-green-100 text-green-700',
  entregue: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700',
}

async function getDashboardData(empresaId: string) {
  const supabase = await createClient()
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()

  // Pedidos do mês (não cancelados) — inclui colunas de custo
  const { data: pedidosMes } = await supabase
    .from('pedidos')
    .select('id, valor_recebido, valor_total, frete_valor, custo_total_pedido, lucro_real, qtd_imas')
    .eq('empresa_id', empresaId)
    .neq('status', 'cancelado')
    .gte('created_at', inicioMes)

  const totalPedidosMes = (pedidosMes || []).length
  const totalEntrou = (pedidosMes || []).reduce(
    (s, p) => s + Number(p.valor_recebido ?? p.valor_total ?? 0), 0
  )
  const totalCorreio = (pedidosMes || []).reduce(
    (s, p) => s + Number(p.frete_valor ?? 0), 0
  )

  // Custo de material — usa coluna salva (custo_total_pedido) se disponível
  const custoMaterialSalvo = (pedidosMes || []).reduce(
    (s, p) => s + Number(p.custo_total_pedido ?? 0), 0
  )

  // Lucro real salvo
  const lucroRealSalvo = (pedidosMes || []).reduce(
    (s, p) => s + Number(p.lucro_real ?? 0), 0
  )

  // Ímãs vendidos
  const totalImas = (pedidosMes || []).reduce(
    (s, p) => s + Number(p.qtd_imas ?? 0), 0
  )

  // Se não tiver custo salvo, calcula via itens (legado)
  let custoMaterial = custoMaterialSalvo
  if (custoMaterial === 0 && (pedidosMes || []).length > 0) {
    const pedidoIds = (pedidosMes || []).map(p => p.id)
    const { data: itens } = await supabase
      .from('itens_pedido')
      .select('quantidade, produto_id')
      .in('pedido_id', pedidoIds)

    if (itens && itens.length > 0) {
      const produtoIds = [...new Set(itens.map(i => i.produto_id).filter(Boolean))]
      if (produtoIds.length > 0) {
        const { data: produtos } = await supabase
          .from('produtos')
          .select('id, custo_total')
          .in('id', produtoIds)
        const custoPorId: Record<string, number> = {}
        ;(produtos || []).forEach(p => { custoPorId[p.id] = Number(p.custo_total ?? 0) })
        custoMaterial = itens.reduce(
          (s, i) => s + i.quantidade * (custoPorId[i.produto_id] ?? 0), 0
        )
      }
    }
  }

  const lucro = lucroRealSalvo > 0 ? lucroRealSalvo : totalEntrou - custoMaterial - totalCorreio
  const margemPct = totalEntrou > 0 ? (lucro / totalEntrou) * 100 : 0

  // Pedidos ativos e recentes
  const [{ data: pedidosAbertos }, { data: pedidosRecentes }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id')
      .eq('empresa_id', empresaId)
      .in('status', ['aprovado', 'producao', 'finalizado']),
    supabase
      .from('pedidos')
      .select('id, numero, status, valor_total, clientes(nome)')
      .eq('empresa_id', empresaId)
      .not('status', 'in', '(entregue,cancelado)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    total_entrou: totalEntrou,
    custo_material: custoMaterial,
    total_correio: totalCorreio,
    lucro_mes: lucro,
    lucro_real_salvo: lucroRealSalvo,
    margem_pct: margemPct,
    total_imas: totalImas,
    total_pedidos_mes: totalPedidosMes,
    pedidos_andamento: (pedidosAbertos || []).length,
    pedidos_recentes: pedidosRecentes || [],
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, empresa_id')
    .eq('id', user!.id)
    .single()

  const dados = await getDashboardData(usuario!.empresa_id)

  const primeiroNome = usuario?.nome?.split(' ')[0] || 'Leticia'

  const hojeStr = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {primeiroNome}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{hojeStr}</p>
        </div>
        <Link href="/configuracoes" className="p-2 rounded-xl bg-white border border-gray-200">
          <Settings size={20} className="text-gray-500" />
        </Link>
      </div>

      {/* Cards principais — linha 1 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-green-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">Quanto entrou</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(dados.total_entrou)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">valor recebido no mês</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <ShoppingBag size={18} className="text-blue-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">Pedidos no mês</p>
          <p className="text-lg font-bold text-blue-700">{dados.total_pedidos_mes}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{dados.pedidos_andamento} em andamento</p>
        </div>
      </div>

      {/* Cards — linha 2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
            <Package size={18} className="text-orange-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">Saiu — Material</p>
          <p className="text-lg font-bold text-orange-700">{formatCurrency(dados.custo_material)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">custo dos produtos vendidos</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
            <Truck size={18} className="text-purple-700" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">Saiu — Correio</p>
          <p className="text-lg font-bold text-purple-700">{formatCurrency(dados.total_correio)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">frete total do mês</p>
        </div>
      </div>

      {/* Lucro — destaque */}
      <div className={`rounded-2xl p-4 border shadow-sm ${
        dados.lucro_mes >= 0
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} className={dados.lucro_mes >= 0 ? 'text-emerald-600' : 'text-red-500'} />
              <p className="text-sm font-semibold text-gray-700">Lucro do mês</p>
            </div>
            <p className="text-[11px] text-gray-500">entrou − material − correio</p>
          </div>
          <p className={`text-2xl font-bold ${dados.lucro_mes >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {formatCurrency(dados.lucro_mes)}
          </p>
        </div>
      </div>

      {/* Novos indicadores de lucro real e ímãs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center mb-3">
            <Heart size={18} className="text-pink-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">💖 Lucro Real</p>
          <p className={`text-lg font-bold ${dados.lucro_real_salvo >= 0 ? 'text-pink-700' : 'text-red-600'}`}>
            {formatCurrency(dados.lucro_real_salvo)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">após custo de materiais</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
            <BarChart2 size={18} className="text-indigo-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">📈 Margem de Lucro</p>
          <p className={`text-lg font-bold ${dados.margem_pct >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
            {dados.margem_pct.toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">sobre valor recebido</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center mb-3">
            <Camera size={18} className="text-teal-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">📸 Ímãs Vendidos</p>
          <p className="text-lg font-bold text-teal-700">{dados.total_imas}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">unidades este mês</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center mb-3">
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">💳 Val. Recebido</p>
          <p className="text-lg font-bold text-green-700">{formatCurrency(dados.total_entrou)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">pix + link no mês</p>
        </div>
      </div>

      {/* Pedidos em aberto */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Pedidos em aberto</h2>
          <Link href="/pedidos" className="text-green-600 text-sm font-medium">
            Ver todos
          </Link>
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
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[pedido.status]}`}>
                  {STATUS_LABELS[pedido.status]}
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
