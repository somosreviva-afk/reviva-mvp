import { createClient } from '@/lib/supabase/server'
import { BarChart2, TrendingUp, Users, Calendar, DollarSign, Star } from 'lucide-react'

export default async function RelatoriosEventosPage() {
  const supabase = await createClient()

  const [
    { data: todosEventos },
    { data: todosLeads },
    { data: financeiro },
    { data: orcamentos },
  ] = await Promise.all([
    supabase.from('eventos').select('*').order('data_evento', { ascending: false }),
    supabase.from('eventos_leads').select('estagio,origem,tipo_evento,valor_estimado,criado_em'),
    supabase.from('eventos_financeiro').select('tipo,valor,data_lancamento'),
    supabase.from('eventos_orcamentos').select('status,valor_final,valor_sugerido,criado_em'),
  ])

  const eventos = todosEventos || []
  const leads = todosLeads || []
  const financeiros = financeiro || []
  const orcs = orcamentos || []

  const totalReceita = financeiros.filter(f => f.tipo === 'receita').reduce((s, f) => s + Number(f.valor), 0)
  const totalDespesa = financeiros.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.valor), 0)
  const lucroTotal = totalReceita - totalDespesa

  const eventosRealizados = eventos.filter(e => e.status === 'realizado')
  const taxaConversao = leads.length > 0
    ? ((eventos.filter(e => e.status !== 'cancelado').length / leads.length) * 100).toFixed(1)
    : '0'

  const ticketMedio = eventosRealizados.length > 0
    ? eventosRealizados.reduce((s, e) => s + Number(e.valor_contrato || 0), 0) / eventosRealizados.length
    : 0

  const porTipoEvento = eventos.reduce((acc: Record<string, number>, e) => {
    const tipo = e.tipo_evento || 'outros'
    acc[tipo] = (acc[tipo] || 0) + 1
    return acc
  }, {})

  const porOrigemLead = leads.reduce((acc: Record<string, number>, l) => {
    const orig = l.origem || 'desconhecida'
    acc[orig] = (acc[orig] || 0) + 1
    return acc
  }, {})

  const orcsAprovados = orcs.filter(o => o.status === 'aprovado').length
  const orcsTotal = orcs.filter(o => o.status !== 'rascunho').length
  const taxaAprovacao = orcsTotal > 0 ? ((orcsAprovados / orcsTotal) * 100).toFixed(0) : '0'

  function fmt(v: number) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  return (
    <div className="p-4 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-purple-900">Relatórios & Métricas</h1>
        <p className="text-xs text-purple-500">Visão executiva do negócio de eventos</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-xs text-green-600 font-medium">Receita total</p>
          <p className="text-xl font-bold text-green-700">R$ {fmt(totalReceita)}</p>
        </div>
        <div className={`rounded-2xl p-4 border ${lucroTotal >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-xs font-medium ${lucroTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Lucro líquido</p>
          <p className={`text-xl font-bold ${lucroTotal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>R$ {fmt(lucroTotal)}</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
          <p className="text-xs text-purple-600 font-medium">Eventos realizados</p>
          <p className="text-xl font-bold text-purple-700">{eventosRealizados.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
          <p className="text-xs text-yellow-700 font-medium">Ticket médio</p>
          <p className="text-xl font-bold text-yellow-700">R$ {fmt(ticketMedio)}</p>
        </div>
      </div>

      {/* Funil de vendas */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={15} className="text-purple-500" />
          Funil de vendas
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total de leads</span>
            <span className="font-semibold">{leads.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Orçamentos enviados</span>
            <span className="font-semibold">{orcsTotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taxa de aprovação de orçamentos</span>
            <span className="font-semibold text-green-600">{taxaAprovacao}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Eventos confirmados</span>
            <span className="font-semibold">{eventos.filter(e => e.status !== 'cancelado').length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taxa de conversão lead → evento</span>
            <span className="font-semibold text-purple-600">{taxaConversao}%</span>
          </div>
        </div>
      </div>

      {/* Eventos por tipo */}
      {Object.keys(porTipoEvento).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-purple-500" />
            Tipos de evento
          </h2>
          <div className="space-y-2">
            {Object.entries(porTipoEvento).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => {
              const pct = Math.round((count / eventos.length) * 100)
              return (
                <div key={tipo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 capitalize">{tipo}</span>
                    <span className="font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Origem dos leads */}
      {Object.keys(porOrigemLead).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
            <Users size={15} className="text-purple-500" />
            Origem dos leads
          </h2>
          <div className="space-y-2">
            {Object.entries(porOrigemLead).sort((a, b) => b[1] - a[1]).map(([origem, count]) => {
              const pct = Math.round((count / leads.length) * 100)
              return (
                <div key={origem} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 capitalize">{origem}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {eventos.length === 0 && leads.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
          <BarChart2 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Dados insuficientes para relatórios</p>
          <p className="text-xs text-gray-400 mt-1">Adicione eventos e leads para ver as métricas</p>
        </div>
      )}
    </div>
  )
}
