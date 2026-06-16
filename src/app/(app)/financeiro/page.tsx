import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { TrendingUp, TrendingDown, Plus } from 'lucide-react'
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
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const mesLabel = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const { data: transacoes } = await supabase
    .from('financeiro')
    .select('*')
    .eq('empresa_id', usuario!.empresa_id)
    .gte('data', inicioMes)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  const lista = transacoes || []
  const totalEntradas = lista.filter(t => t.tipo === 'entrada').reduce((s, t) => s + Number(t.valor), 0)
  const totalSaidas = lista.filter(t => t.tipo === 'saida').reduce((s, t) => s + Number(t.valor), 0)
  const saldo = totalEntradas - totalSaidas

  return (
    <div className="p-4">
      <div className="flex items-center justify-between pt-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 capitalize">{mesLabel}</p>
        </div>
      </div>

      {/* Saldo */}
      <div className="bg-green-600 rounded-2xl p-5 mb-4 text-white">
        <p className="text-sm text-green-200 mb-1">Saldo líquido do mês</p>
        <p className="text-3xl font-bold">{formatCurrency(saldo)}</p>
      </div>

      {/* Entradas / Saídas */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={14} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-500">Entradas</span>
          </div>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown size={14} className="text-red-500" />
            </div>
            <span className="text-xs text-gray-500">Saídas</span>
          </div>
          <p className="text-lg font-bold text-red-500">{formatCurrency(totalSaidas)}</p>
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

      {/* Histórico */}
      <h2 className="font-semibold text-gray-900 mb-3">Histórico</h2>
      {lista.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">Nenhuma movimentação este mês</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
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
      )}
    </div>
  )
}
