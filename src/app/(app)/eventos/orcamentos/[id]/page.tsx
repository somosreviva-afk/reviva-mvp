'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'

export default function OrcamentoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [orc, setOrc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('eventos_orcamentos').select('*').eq('id', id).single()
    setOrc(data)
    setLoading(false)
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function mudarStatus(novoStatus: string) {
    setAtualizando(true)
    await supabase.from('eventos_orcamentos').update({ status: novoStatus }).eq('id', id)
    await carregar()
    setAtualizando(false)
  }

  async function converterEmEvento() {
    if (!orc) return
    setAtualizando(true)
    const { count } = await supabase.from('eventos').select('*', { count: 'exact', head: true })
    const { data: novoEvento } = await supabase.from('eventos').insert({
      orcamento_id: orc.id,
      nome_evento: `Evento ${orc.numero}`,
      data_evento: orc.data_evento,
      local_evento: orc.local_evento,
      qtd_convidados: orc.qtd_convidados,
      status: 'confirmado',
      valor_contrato: orc.valor_final || orc.valor_sugerido,
      valor_sinal: (orc.valor_final || orc.valor_sugerido) * (orc.sinal_percentual / 100),
      valor_restante: (orc.valor_final || orc.valor_sugerido) * (1 - orc.sinal_percentual / 100),
      custo_total: orc.custo_total,
      lucro_estimado: (orc.valor_final || orc.valor_sugerido) - orc.custo_total,
    }).select().single()

    await supabase.from('eventos_orcamentos').update({ status: 'aprovado' }).eq('id', id)

    setAtualizando(false)
    if (novoEvento) {
      router.push(`/eventos/${novoEvento.id}`)
    }
  }

  function fmt(v: number) {
    return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }
  function fmtData(d: string) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>
  if (!orc) return <div className="p-8 text-center text-gray-400">Orçamento não encontrado</div>

  const valorFinal = Number(orc.valor_final || orc.valor_sugerido || 0)
  const sinal = valorFinal * (Number(orc.sinal_percentual || 50) / 100)
  const restante = valorFinal - sinal

  return (
    <div className="p-4 space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <Link href="/eventos/orcamentos" className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-base font-bold text-gray-800">{orc.numero}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            orc.status === 'aprovado' ? 'bg-green-100 text-green-700' :
            orc.status === 'enviado' ? 'bg-yellow-100 text-yellow-700' :
            orc.status === 'recusado' ? 'bg-red-100 text-red-600' :
            'bg-gray-100 text-gray-600'
          }`}>{orc.status}</span>
        </div>
      </div>

      {/* Detalhes */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="font-semibold text-gray-800 text-sm">Detalhes do evento</h2>
        {[
          { label: 'Data', value: fmtData(orc.data_evento) },
          { label: 'Local', value: orc.local_evento || '—' },
          { label: 'Convidados', value: orc.qtd_convidados ? `${orc.qtd_convidados} pessoas` : '—' },
          { label: 'Horas', value: orc.horas_evento ? `${orc.horas_evento}h` : '—' },
          { label: 'Validade', value: orc.validade_dias ? `${orc.validade_dias} dias` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800">{value}</span>
          </div>
        ))}
      </div>

      {/* Breakdown de custos */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Custos</h2>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Fotoímãs', val: orc.custo_fotoimagas },
            { label: 'Auxiliar', val: orc.custo_auxiliar },
            { label: 'Combustível', val: orc.custo_combustivel },
            { label: 'Pedágio', val: orc.custo_pedagio },
            { label: 'Alimentação', val: orc.custo_alimentacao },
            { label: 'Hospedagem', val: orc.custo_hospedagem },
            { label: 'Embalagem', val: orc.custo_embalagem },
            { label: 'Outros', val: orc.custo_outros },
          ].filter(i => Number(i.val) > 0).map(({ label, val }) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span>R$ {fmt(Number(val))}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold border-t border-gray-100 pt-2">
            <span>Custo total</span>
            <span>R$ {fmt(Number(orc.custo_total))}</span>
          </div>
        </div>
      </div>

      {/* Precificação */}
      <div className="bg-purple-600 rounded-2xl p-4 text-white space-y-3">
        <h2 className="font-semibold text-sm">Precificação</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-purple-200">Margem de lucro</span>
            <span>{orc.margem_lucro}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-200">Preço sugerido</span>
            <span>R$ {fmt(Number(orc.valor_sugerido))}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-purple-500 pt-2">
            <span>Valor final</span>
            <span>R$ {fmt(valorFinal)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-700 rounded-xl p-3">
            <p className="text-xs text-purple-300">Sinal ({orc.sinal_percentual}%)</p>
            <p className="font-bold">R$ {fmt(sinal)}</p>
          </div>
          <div className="bg-purple-700 rounded-xl p-3">
            <p className="text-xs text-purple-300">Restante</p>
            <p className="font-bold">R$ {fmt(restante)}</p>
          </div>
        </div>
      </div>

      {orc.observacoes && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-1">Observações</p>
          <p className="text-sm text-gray-700">{orc.observacoes}</p>
        </div>
      )}

      {/* Ações */}
      {orc.status !== 'aprovado' && orc.status !== 'recusado' && (
        <div className="space-y-3">
          {orc.status === 'rascunho' && (
            <button
              onClick={() => mudarStatus('enviado')}
              disabled={atualizando}
              className="w-full bg-yellow-500 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              Marcar como enviado ao cliente
            </button>
          )}
          <button
            onClick={converterEmEvento}
            disabled={atualizando}
            className="w-full bg-green-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} />
            {atualizando ? 'Convertendo...' : 'Aprovado! Criar evento'}
          </button>
          <button
            onClick={() => mudarStatus('recusado')}
            disabled={atualizando}
            className="w-full bg-white border-2 border-red-300 text-red-500 rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <XCircle size={16} />
            Marcar como recusado
          </button>
        </div>
      )}

      {orc.status === 'aprovado' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <CheckCircle size={24} className="text-green-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-green-700">Orçamento aprovado!</p>
          <p className="text-xs text-green-600">Um evento foi criado na agenda.</p>
          <Link href="/eventos/agenda" className="text-green-700 text-sm font-medium underline mt-2 block">Ver agenda →</Link>
        </div>
      )}
    </div>
  )
}
