import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, MapPin, Users, DollarSign, CheckCircle, Clock } from 'lucide-react'

const STATUS_COR: Record<string, string> = {
  confirmado: 'border-l-blue-400 bg-blue-50',
  em_andamento: 'border-l-yellow-400 bg-yellow-50',
  realizado: 'border-l-green-400 bg-green-50',
  cancelado: 'border-l-red-400 bg-gray-50',
}
const STATUS_BADGE: Record<string, string> = {
  confirmado: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-yellow-100 text-yellow-700',
  realizado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  confirmado: 'Confirmado',
  em_andamento: 'Em andamento',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
}

export default async function AgendaPage() {
  const supabase = await createClient()
  const hoje = new Date().toISOString().split('T')[0]

  const { data: eventos } = await supabase
    .from('eventos')
    .select('*')
    .order('data_evento', { ascending: true })

  const proximos = (eventos || []).filter((e: any) => e.data_evento >= hoje && e.status !== 'cancelado')
  const passados = (eventos || []).filter((e: any) => e.data_evento < hoje || e.status === 'cancelado')

  function formatarData(d: string, h?: string) {
    const data = new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: 'long', year: 'numeric'
    })
    return h ? `${data} às ${h.substring(0, 5)}` : data
  }

  function EventoCard({ ev }: { ev: any }) {
    return (
      <Link href={`/eventos/${ev.id}`} className={`border-l-4 rounded-r-2xl rounded-l-sm p-4 shadow-sm block ${STATUS_COR[ev.status] || 'border-l-gray-300 bg-white'}`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-gray-800">{ev.nome_evento}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[ev.status] || ''}`}>
              {STATUS_LABEL[ev.status] || ev.status}
            </span>
          </div>
          {ev.valor_contrato && (
            <span className="text-sm font-bold text-green-600">
              R$ {Number(ev.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Calendar size={11} />{formatarData(ev.data_evento, ev.horario_inicio)}</span>
          {ev.local_evento && <span className="flex items-center gap-1"><MapPin size={11} />{ev.local_evento}</span>}
          {ev.qtd_convidados && <span className="flex items-center gap-1"><Users size={11} />{ev.qtd_convidados} convidados</span>}
        </div>
        {ev.status === 'confirmado' && (
          <div className="mt-2 flex gap-2 text-xs">
            <span className={`flex items-center gap-1 ${ev.sinal_pago ? 'text-green-600' : 'text-orange-500'}`}>
              {ev.sinal_pago ? <CheckCircle size={11} /> : <Clock size={11} />}
              Sinal R$ {Number(ev.valor_sinal || 0).toFixed(2)} {ev.sinal_pago ? '✓' : 'pendente'}
            </span>
          </div>
        )}
      </Link>
    )
  }

  return (
    <div className="p-4 space-y-5">
      <div>
        <h1 className="text-lg font-bold text-purple-900">Agenda de Eventos</h1>
        <p className="text-xs text-purple-500">{(eventos || []).length} evento{(eventos || []).length !== 1 ? 's' : ''} no total</p>
      </div>

      {proximos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Próximos / Ativos</h2>
          {proximos.map((ev: any) => <EventoCard key={ev.id} ev={ev} />)}
        </div>
      )}

      {passados.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Histórico</h2>
          {passados.map((ev: any) => <EventoCard key={ev.id} ev={ev} />)}
        </div>
      )}

      {(eventos || []).length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
          <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Nenhum evento cadastrado</p>
          <p className="text-xs text-gray-400 mt-1">Os eventos aparecem aqui quando confirmados via orçamento</p>
        </div>
      )}
    </div>
  )
}
