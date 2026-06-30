import { createClient } from '@/lib/supabase/server'
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'

export default async function FinanceiroEventosPage() {
  const supabase = await createClient()
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

  const [{ data: todosMes }, { data: geral }, { data: eventos }] = await Promise.all([
    supabase.from('eventos_financeiro').select('*, eventos(nome_evento)').gte('data_lancamento', inicioMes).lte('data_lancamento', fimMes).order('data_lancamento', { ascending: false }),
    supabase.from('eventos_financeiro').select('tipo,valor'),
    supabase.from('eventos').select('id,nome_evento,valor_contrato,custo_total,lucro_estimado,status').eq('status', 'realizado').order('data_evento', { ascending: false }).limit(5),
  ])

  const receitaMes = (todosMes || []).filter((f: any) => f.tipo === 'receita').reduce((s: number, f: any) => s + Number(f.valor), 0)
  const despesaMes = (todosMes || []).filter((f: any) => f.tipo === 'despesa').reduce((s: number, f: any) => s + Number(f.valor), 0)
  const receitaTotal = (geral || []).filter((f: any) => f.tipo === 'receita').reduce((s: number, f: any) => s + Number(f.valor), 0)
  const despesaTotal = (geral || []).filter((f: any) => f.tipo === 'despesa').reduce((s: number, f: any) => s + Number(f.valor), 0)

  function fmt(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-purple-900">Financeiro de Eventos</h1>
        <p className="text-xs text-purple-500 capitalize">{mesAtual}</p>
      </div>

      {/* Cards do mês */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 rounded-2xl p-3 border border-green-100">
          <p className="text-[10px] text-green-600 font-medium">Receita mês</p>
          <p className="text-base font-bold text-green-700 mt-0.5">R$ {fmt(receitaMes)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
          <p className="text-[10px] text-red-600 font-medium">Gastos mês</p>
          <p className="text-base font-bold text-red-600 mt-0.5">R$ {fmt(despesaMes)}</p>
        </div>
        <div className={`rounded-2xl p-3 border ${receitaMes - despesaMes >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className={`text-[10px] font-medium ${receitaMes - despesaMes >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Lucro mês</p>
          <p className={`text-base font-bold mt-0.5 ${receitaMes - despesaMes >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>R$ {fmt(receitaMes - despesaMes)}</p>
        </div>
      </div>

      {/* Total geral */}
      <div className="bg-purple-600 rounded-2xl p-4 text-white">
        <p className="text-xs text-purple-200 font-medium mb-2">Total histórico</p>
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-purple-300 text-xs">Total recebido</p>
            <p className="font-bold text-lg">R$ {fmt(receitaTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-purple-300 text-xs">Total gasto</p>
            <p className="font-bold text-lg">R$ {fmt(despesaTotal)}</p>
          </div>
        </div>
        <div className="border-t border-purple-500 mt-3 pt-3 flex justify-between">
          <span className="text-purple-200">Lucro total</span>
          <span className="font-bold">R$ {fmt(receitaTotal - despesaTotal)}</span>
        </div>
      </div>

      {/* Últimos eventos realizados com lucratividade */}
      {(eventos || []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Lucratividade por evento</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(eventos || []).map((ev: any) => (
              <div key={ev.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">{ev.nome_evento}</p>
                  <span className={`text-sm font-bold ${Number(ev.lucro_estimado) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    R$ {fmt(Number(ev.lucro_estimado || 0))}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                  <span>Contrato: R$ {fmt(Number(ev.valor_contrato || 0))}</span>
                  <span>Custo: R$ {fmt(Number(ev.custo_total || 0))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lançamentos do mês */}
      {(todosMes || []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-sm">Lançamentos do mês</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(todosMes || []).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-700">{f.descricao}</p>
                  {f.eventos?.nome_evento && <p className="text-xs text-gray-400">{f.eventos.nome_evento}</p>}
                  <p className="text-xs text-gray-400">{new Date(f.data_lancamento).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`text-sm font-bold ${f.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                  {f.tipo === 'receita' ? '+' : '-'} R$ {fmt(Number(f.valor))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(todosMes || []).length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
          <DollarSign size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">Nenhum lançamento este mês</p>
        </div>
      )}
    </div>
  )
}
