import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, CheckCircle, ClipboardList, Phone } from 'lucide-react'
import { EventoAcoesClient } from './EventoAcoesClient'

export default async function EventoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: evento }, { data: checklists }, { data: financeiro }] = await Promise.all([
    supabase.from('eventos').select('*, eventos_clientes(*)').eq('id', id).single(),
    supabase.from('eventos_checklists').select('*').eq('evento_id', id).order('ordem'),
    supabase.from('eventos_financeiro').select('*').eq('evento_id', id).order('data_lancamento'),
  ])

  if (!evento) notFound()

  function formatarData(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  const totalPago = (financeiro || []).filter((f: any) => f.tipo === 'receita').reduce((s: number, f: any) => s + Number(f.valor), 0)
  const totalDespesa = (financeiro || []).filter((f: any) => f.tipo === 'despesa').reduce((s: number, f: any) => s + Number(f.valor), 0)
  const concluidos = (checklists || []).filter((c: any) => c.concluido).length

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <Link href="/eventos/agenda" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-800">{evento.nome_evento}</h1>
          <p className="text-xs text-purple-600 capitalize">{evento.tipo_evento || 'Evento'}</p>
        </div>
      </div>

      {/* Info principal */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar size={15} className="text-purple-500" />
            <span>{formatarData(evento.data_evento)}</span>
          </div>
          {evento.horario_inicio && (
            <div className="text-gray-500 text-xs">
              {evento.horario_inicio.substring(0, 5)}{evento.horario_fim ? ` – ${evento.horario_fim.substring(0, 5)}` : ''}
            </div>
          )}
          {evento.local_evento && (
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin size={15} className="text-purple-500" />
              <span>{evento.local_evento}</span>
            </div>
          )}
          {evento.qtd_convidados && (
            <div className="flex items-center gap-2 text-gray-700">
              <Users size={15} className="text-purple-500" />
              <span>{evento.qtd_convidados} convidados</span>
            </div>
          )}
        </div>
        {evento.observacoes && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{evento.observacoes}</p>
        )}
      </div>

      {/* Financeiro */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
          <DollarSign size={15} className="text-green-500" />
          Financeiro
        </h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Contrato</p>
            <p className="text-sm font-bold text-gray-800">R$ {Number(evento.valor_contrato || 0).toFixed(2)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Recebido</p>
            <p className="text-sm font-bold text-green-600">R$ {totalPago.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Gastos</p>
            <p className="text-sm font-bold text-red-500">R$ {totalDespesa.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              {evento.sinal_pago ? <CheckCircle size={14} className="text-green-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />}
              Sinal ({evento.sinal_pago ? 'pago' : 'pendente'})
            </span>
            <span className={`font-semibold ${evento.sinal_pago ? 'text-green-600' : 'text-orange-500'}`}>
              R$ {Number(evento.valor_sinal || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              {evento.restante_pago ? <CheckCircle size={14} className="text-green-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />}
              Restante ({evento.restante_pago ? 'pago' : 'pendente'})
            </span>
            <span className={`font-semibold ${evento.restante_pago ? 'text-green-600' : 'text-orange-500'}`}>
              R$ {Number(evento.valor_restante || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Checklist */}
      {(checklists || []).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <ClipboardList size={15} className="text-purple-500" />
              Checklist
            </h2>
            <span className="text-xs text-gray-500">{concluidos}/{(checklists || []).length}</span>
          </div>
          <EventoAcoesClient eventoId={id} checklists={checklists || []} />
        </div>
      )}

      {/* Link para checklist completo */}
      <Link href={`/eventos/checklists?evento=${id}`} className="block bg-purple-50 border border-purple-200 rounded-2xl p-3 text-center text-sm text-purple-700 font-medium">
        Gerenciar checklist completo →
      </Link>
    </div>
  )
}
