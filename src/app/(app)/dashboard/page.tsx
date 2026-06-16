import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'
import { TrendingUp, DollarSign, ShoppingBag, TrendingDown, Settings } from 'lucide-react'
import Link from 'next/link'

async function getDashboardData(empresaId: string) {
  const supabase = await createClient()
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const [{ data: entradas }, { data: saidas }, { data: pedidosAbertos }, { data: pedidosRecentes }] =
    await Promise.all([
      supabase
        .from('financeiro')
        .select('valor')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'entrada')
        .gte('data', inicioMes),
      supabase
        .from('financeiro')
        .select('valor')
        .eq('empresa_id', empresaId)
        .eq('tipo', 'saida')
        .gte('data', inicioMes),
      supabase
        .from('pedidos')
        .select('id')
        .eq('empresa_id', empresaId)
        .in('status', ['aprovado', 'producao']),
      supabase
        .from('pedidos')
        .select('id, numero, status, valor_total, data_pedido, clientes(nome)')
        .eq('empresa_id', empresaId)
        .not('status', 'in', '(entregue,cancelado)')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  const totalEntradas = (entradas || []).reduce((s, r) => s + Number(r.valor), 0)
  const totalSaidas = (saidas || []).reduce((s, r) => s + Number(r.valor), 0)

  return {
    vendas_mes: totalEntradas,
    gastos_mes: totalSaidas,
    lucro_mes: totalEntradas - totalSaidas,
    caixa_atual: totalEntradas - totalSaidas,
    pedidos_andamento: (pedidosAbertos || []).length,
    pedidos_recentes: pedidosRecentes || [],
  }
}

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

  const cards = [
    {
      label: 'Caixa atual',
      value: formatCurrency(dados.caixa_atual),
      icon: DollarSign,
      cor: 'text-green-700',
      bg: 'bg-green-100',
    },
    {
      label: 'Pedidos ativos',
      value: String(dados.pedidos_andamento),
      icon: ShoppingBag,
      cor: 'text-blue-700',
      bg: 'bg-blue-100',
    },
    {
      label: 'Vendas do mês',
      value: formatCurrency(dados.vendas_mes),
      icon: TrendingUp,
      cor: 'text-purple-700',
      bg: 'bg-purple-100',
    },
    {
      label: 'Lucro do mês',
      value: formatCurrency(dados.lucro_mes),
      icon: TrendingDown,
      cor: 'text-emerald-700',
      bg: 'bg-emerald-100',
    },
  ]

  return (
    <div className="p-4 space-y-5">
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

      {/* Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, value, icon: Icon, cor, bg }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
          >
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={cor} />
            </div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            <p className={`text-lg font-bold ${cor}`}>{value}</p>
          </div>
        ))}
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
          <p className="text-gray-400 text-sm text-center py-4">
            Nenhum pedido em aberto
          </p>
        ) : (
          <div className="space-y-3">
            {dados.pedidos_recentes.map((pedido: any) => (
              <Link
                key={pedido.id}
                href={`/pedidos/${pedido.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {pedido.clientes?.nome}
                  </p>
                  <p className="text-xs text-gray-500">
                    #{pedido.numero} · {formatCurrency(pedido.valor_total)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    STATUS_COLORS[pedido.status]
                  }`}
                >
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
    </div>
  )
}
