import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, FileText, DollarSign, Kanban, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default async function EventosDashboard() {
  const supabase = await createClient()

  // Buscar dados do dashboard
  const hoje = new Date().toISOString().split('T')[0]
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const fimMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: eventosProximos },
    { data: orcamentosPendentes },
    { data: leadsNovos },
    { data: receitaMes },
    { data: eventosRealizados },
    { data: todosEventos },
  ] = await Promise.all([
    supabase
      .from('eventos')
      .select('*')
      .gte('data_evento', hoje)
      .eq('status', 'confirmado')
      .order('data_evento', { ascending: true })
      .limit(3),
    supabase
      .from('eventos_orcamentos')
      .select('*')
      .eq('status', 'enviado')
      .order('criado_em', { ascending: false })
      .limit(5),
    supabase
      .from('eventos_leads')
      .select('*')
      .eq('estagio', 'novo_lead')
      .order('criado_em', { ascending: false }),
    supabase
      .from('eventos_financeiro')
      .select('valor')
      .eq('tipo', 'receita')
      .gte('data_lancamento', inicioMes)
      .lte('data_lancamento', fimMes),
    supabase
      .from('eventos')
      .select('id')
      .eq('status', 'realizado')
      .gte('data_evento', inicioMes)
      .lte('data_evento', fimMes),
    supabase
      .from('eventos')
      .select('lucro_estimado, custo_total, valor_contrato')
      .eq('status', 'realizado'),
  ])

  const totalReceitaMes = (receitaMes || []).reduce((s, r) => s + Number(r.valor), 0)
  const totalLucroGeral = (todosEventos || []).reduce((s, e) => s + Number(e.lucro_estimado || 0), 0)

  function formatarData(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  function diasAte(d: string) {
    const diff = Math.ceil((new Date(d + 'T00:00:00').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'Hoje'
    if (diff === 1) return 'Amanhã'
    return `em ${diff} dias`
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-purple-900">Dashboard de Eventos</h1>
        <p className="text-sm text-purple-600">Visão geral do seu negócio de eventos</p>
      </div>

      {/* Métricas do mês */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-green-500" />
            <span className="text-xs text-gray-500">Receita do mês</span>
          </div>
          <p className="text-xl font-bold text-green-600">
            R$ {totalReceitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-purple-500" />
            <span className="text-xs text-gray-500">Eventos realizados</span>
          </div>
          <p className="text-xl font-bold text-purple-700">{(eventosRealizados || []).length}</p>
          <p className="text-xs text-gray-400">neste mês</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-orange-500" />
            <span className="text-xs text-gray-500">Leads aguardando</span>
          </div>
          <p className="text-xl font-bold text-orange-600">{(leadsNovos || []).length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-blue-500" />
            <span className="text-xs text-gray-500">Lucro total</span>
          </div>
          <p className="text-xl font-bold text-blue-600">
            R$ {totalLucroGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Próximos eventos */}
      <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-purple-600" />
            <span className="font-semibold text-gray-800 text-sm">Próximos eventos</span>
          </div>
          <Link href="/eventos/agenda" className="text-xs text-purple-600 font-medium">Ver todos</Link>
        </div>
        {(eventosProximos || []).length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">Nenhum evento agendado</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(eventosProximos || []).map((ev: any) => (
              <Link key={ev.id} href={`/eventos/${ev.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-purple-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{ev.nome_evento}</p>
                  <p className="text-xs text-gray-500">{ev.local_evento} · {ev.qtd_convidados} convidados</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-purple-700">{formatarData(ev.data_evento)}</p>
                  <p className="text-[10px] text-gray-400">{diasAte(ev.data_evento)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Orçamentos pendentes */}
      {(orcamentosPendentes || []).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-orange-500" />
              <span className="font-semibold text-gray-800 text-sm">Orçamentos aguardando resposta</span>
            </div>
            <Link href="/eventos/orcamentos" className="text-xs text-orange-500 font-medium">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {(orcamentosPendentes || []).map((orc: any) => (
              <Link key={orc.id} href={`/eventos/orcamentos/${orc.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-800">{orc.numero}</p>
                  <p className="text-xs text-gray-500">{orc.qtd_convidados} convidados</p>
                </div>
                <p className="text-sm font-bold text-green-600">
                  R$ {Number(orc.valor_final || orc.valor_sugerido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/eventos/orcamentos/novo" className="bg-purple-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <FileText size={20} />
          <div>
            <p className="text-sm font-semibold">Novo orçamento</p>
            <p className="text-[10px] text-purple-200">Simular preços</p>
          </div>
        </Link>
        <Link href="/eventos/crm" className="bg-white border border-purple-200 text-purple-700 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <Kanban size={20} />
          <div>
            <p className="text-sm font-semibold">CRM Kanban</p>
            <p className="text-[10px] text-purple-400">Gerenciar leads</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
