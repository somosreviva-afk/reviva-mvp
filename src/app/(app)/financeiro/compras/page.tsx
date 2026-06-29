import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export default async function ComprasMaterialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios').select('empresa_id').eq('id', user!.id).single()

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const mesLabel = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const { data: compras } = await supabase
    .from('movimentacoes_estoque')
    .select('valor_pago, observacoes, data, quantidade, insumos(nome, unidade)')
    .eq('empresa_id', usuario!.empresa_id)
    .eq('tipo', 'entrada')
    .not('valor_pago', 'is', null)
    .gte('data', inicioMes)
    .order('data', { ascending: false })

  const total = (compras || []).reduce((s, c) => s + Number(c.valor_pago || 0), 0)

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-3 pt-4 mb-5">
        <Link href="/financeiro" className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Compras de Material</h1>
          <p className="text-xs text-gray-400 capitalize">{mesLabel}</p>
        </div>
      </div>

      {/* Total */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
        <p className="text-xs text-orange-500 font-semibold mb-1">Total gasto em materiais</p>
        <p className="text-3xl font-bold text-orange-600">−{formatCurrency(total)}</p>
      </div>

      {/* Lista */}
      {!compras || compras.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">Nenhuma compra registrada este mês</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {compras.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <ShoppingCart size={14} className="text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {(c.insumos as any)?.nome || 'Material'}
                  </p>
                  {c.observacoes && (
                    <p className="text-xs text-gray-400 truncate">{c.observacoes}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    {c.quantidade > 0 && ` · ${Number(c.quantidade).toFixed(0)} ${(c.insumos as any)?.unidade || 'un'}`}
                  </p>
                </div>
              </div>
              <p className="text-base font-bold text-orange-600 ml-3">
                −{formatCurrency(Number(c.valor_pago))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
