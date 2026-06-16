import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/formatters'
import { Plus, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

const STATUS_ORDER = ['orcamento', 'aprovado', 'producao', 'finalizado', 'entregue']

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user!.id)
    .single()

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('*, clientes(nome, whatsapp)')
    .eq('empresa_id', usuario!.empresa_id)
    .not('status', 'eq', 'cancelado')
    .order('created_at', { ascending: false })

  const pedidosPorStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = (pedidos || []).filter(p => p.status === status)
    return acc
  }, {} as Record<string, typeof pedidos>)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between pt-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <Link
          href="/pedidos/novo"
          className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          Novo
        </Link>
      </div>

      {!pedidos || pedidos.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum pedido ainda</p>
          <Link
            href="/pedidos/novo"
            className="inline-block mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium"
          >
            Criar pedido
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {STATUS_ORDER.map(status => {
            const lista = pedidosPorStatus[status] || []
            if (lista.length === 0) return null
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs text-gray-400">{lista.length}</span>
                </div>
                <div className="space-y-2">
                  {lista.map((pedido: any) => (
                    <Link
                      key={pedido.id}
                      href={`/pedidos/${pedido.id}`}
                      className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {pedido.clientes?.nome}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            #{pedido.numero}
                            {pedido.data_entrega && ` · Entrega: ${formatDate(pedido.data_entrega)}`}
                          </p>
                        </div>
                        <p className="text-base font-bold text-gray-900">
                          {formatCurrency(pedido.valor_total)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
