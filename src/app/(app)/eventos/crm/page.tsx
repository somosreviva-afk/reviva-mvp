'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Plus, Phone, Calendar, Users, ChevronRight } from 'lucide-react'

const ESTAGIOS = [
  { id: 'novo_lead', label: 'Novo Lead', cor: 'bg-gray-100 border-gray-300', corTexto: 'text-gray-700', corHeader: 'bg-gray-500' },
  { id: 'contato_feito', label: 'Contato Feito', cor: 'bg-blue-50 border-blue-200', corTexto: 'text-blue-700', corHeader: 'bg-blue-500' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', cor: 'bg-yellow-50 border-yellow-200', corTexto: 'text-yellow-700', corHeader: 'bg-yellow-500' },
  { id: 'negociacao', label: 'Negociação', cor: 'bg-orange-50 border-orange-200', corTexto: 'text-orange-700', corHeader: 'bg-orange-500' },
  { id: 'contrato_assinado', label: 'Contrato Assinado', cor: 'bg-purple-50 border-purple-200', corTexto: 'text-purple-700', corHeader: 'bg-purple-600' },
  { id: 'sinal_pago', label: 'Sinal Pago', cor: 'bg-indigo-50 border-indigo-200', corTexto: 'text-indigo-700', corHeader: 'bg-indigo-600' },
  { id: 'preparacao', label: 'Em Preparação', cor: 'bg-pink-50 border-pink-200', corTexto: 'text-pink-700', corHeader: 'bg-pink-500' },
  { id: 'evento_realizado', label: 'Evento Realizado', cor: 'bg-green-50 border-green-200', corTexto: 'text-green-700', corHeader: 'bg-green-600' },
  { id: 'pos_evento', label: 'Pós-evento', cor: 'bg-teal-50 border-teal-200', corTexto: 'text-teal-700', corHeader: 'bg-teal-500' },
  { id: 'feedback_recebido', label: 'Feedback Recebido', cor: 'bg-cyan-50 border-cyan-200', corTexto: 'text-cyan-700', corHeader: 'bg-cyan-500' },
  { id: 'cliente_finalizado', label: 'Cliente Finalizado', cor: 'bg-emerald-50 border-emerald-200', corTexto: 'text-emerald-700', corHeader: 'bg-emerald-600' },
]

type Lead = {
  id: string
  nome_responsavel: string
  tipo_evento: string
  data_evento: string
  qtd_convidados: number
  valor_estimado: number
  estagio: string
  telefone: string
  origem: string
}

export default function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [movendo, setMovendo] = useState<string | null>(null)
  const [estagioSelecionado, setEstagioSelecionado] = useState('novo_lead')
  const [showNovoLead, setShowNovoLead] = useState(false)
  const [novoLead, setNovoLead] = useState({ nome_responsavel: '', telefone: '', tipo_evento: '', data_evento: '', qtd_convidados: '', valor_estimado: '', origem: 'whatsapp' })
  const [salvando, setSalvando] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregarLeads = useCallback(async () => {
    const { data } = await supabase.from('eventos_leads').select('*').order('criado_em', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregarLeads() }, [carregarLeads])

  async function moverEstagio(leadId: string, novoEstagio: string) {
    setMovendo(leadId)
    await supabase.from('eventos_leads').update({ estagio: novoEstagio, atualizado_em: new Date().toISOString() }).eq('id', leadId)
    await carregarLeads()
    setMovendo(null)
  }

  async function salvarNovoLead() {
    if (!novoLead.nome_responsavel.trim()) return
    setSalvando(true)
    await supabase.from('eventos_leads').insert({
      ...novoLead,
      qtd_convidados: novoLead.qtd_convidados ? parseInt(novoLead.qtd_convidados) : null,
      valor_estimado: novoLead.valor_estimado ? parseFloat(novoLead.valor_estimado) : null,
      estagio: 'novo_lead',
    })
    await carregarLeads()
    setNovoLead({ nome_responsavel: '', telefone: '', tipo_evento: '', data_evento: '', qtd_convidados: '', valor_estimado: '', origem: 'whatsapp' })
    setShowNovoLead(false)
    setSalvando(false)
  }

  const estagioAtual = ESTAGIOS.find(e => e.id === estagioSelecionado)!
  const leadsEstagio = leads.filter(l => l.estagio === estagioSelecionado)
  const estagioIdx = ESTAGIOS.findIndex(e => e.id === estagioSelecionado)
  const proximoEstagio = ESTAGIOS[estagioIdx + 1]
  const anteriorEstagio = ESTAGIOS[estagioIdx - 1]

  function formatarData(d: string) {
    if (!d) return ''
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando CRM...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-purple-900">CRM de Eventos</h1>
          <p className="text-xs text-purple-500">{leads.length} lead{leads.length !== 1 ? 's' : ''} no total</p>
        </div>
        <button
          onClick={() => setShowNovoLead(true)}
          className="bg-purple-600 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          Novo lead
        </button>
      </div>

      {/* Seletor de estágio (estilo tabs horizontal) */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-1">
          {ESTAGIOS.map(e => {
            const count = leads.filter(l => l.estagio === e.id).length
            return (
              <button
                key={e.id}
                onClick={() => setEstagioSelecionado(e.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
                  estagioSelecionado === e.id ? `${e.corHeader} text-white border-transparent shadow` : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {e.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${estagioSelecionado === e.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cards do estágio atual */}
      <div className="space-y-3">
        {leadsEstagio.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm border border-dashed border-gray-200">
            Nenhum lead neste estágio
          </div>
        ) : (
          leadsEstagio.map(lead => (
            <div key={lead.id} className={`bg-white rounded-2xl border-2 ${estagioAtual.cor} overflow-hidden shadow-sm`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{lead.nome_responsavel}</p>
                    <p className={`text-xs font-medium ${estagioAtual.corTexto}`}>{lead.tipo_evento || 'Evento'}</p>
                  </div>
                  {lead.valor_estimado && (
                    <span className="text-sm font-bold text-green-600">
                      R$ {Number(lead.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                  {lead.data_evento && (
                    <span className="flex items-center gap-1"><Calendar size={11} />{formatarData(lead.data_evento)}</span>
                  )}
                  {lead.qtd_convidados && (
                    <span className="flex items-center gap-1"><Users size={11} />{lead.qtd_convidados} convidados</span>
                  )}
                  {lead.telefone && (
                    <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`} className="flex items-center gap-1 text-green-600">
                      <Phone size={11} />{lead.telefone}
                    </a>
                  )}
                </div>

                {/* Botões de mover estágio */}
                <div className="flex gap-2">
                  {anteriorEstagio && (
                    <button
                      onClick={() => moverEstagio(lead.id, anteriorEstagio.id)}
                      disabled={movendo === lead.id}
                      className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      ← {anteriorEstagio.label}
                    </button>
                  )}
                  {proximoEstagio && (
                    <button
                      onClick={() => moverEstagio(lead.id, proximoEstagio.id)}
                      disabled={movendo === lead.id}
                      className={`flex-1 text-xs py-1.5 rounded-lg text-white transition-colors ${proximoEstagio.corHeader} flex items-center justify-center gap-1`}
                    >
                      {proximoEstagio.label} <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal novo lead */}
      {showNovoLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800">Novo Lead</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nome do responsável *</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={novoLead.nome_responsavel}
                  onChange={e => setNovoLead(p => ({ ...p, nome_responsavel: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Telefone / WhatsApp</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={novoLead.telefone}
                  onChange={e => setNovoLead(p => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  type="tel"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Tipo de evento</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={novoLead.tipo_evento}
                  onChange={e => setNovoLead(p => ({ ...p, tipo_evento: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  <option value="casamento">Casamento</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="corporativo">Corporativo</option>
                  <option value="formatura">Formatura</option>
                  <option value="debutante">Debutante</option>
                  <option value="batizado">Batizado</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Data do evento</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                    value={novoLead.data_evento}
                    onChange={e => setNovoLead(p => ({ ...p, data_evento: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Convidados (estimado)</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                    value={novoLead.qtd_convidados}
                    onChange={e => setNovoLead(p => ({ ...p, qtd_convidados: e.target.value }))}
                    placeholder="100"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Origem do contato</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={novoLead.origem}
                  onChange={e => setNovoLead(p => ({ ...p, origem: e.target.value }))}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="indicacao">Indicação</option>
                  <option value="site">Site</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Valor estimado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={novoLead.valor_estimado}
                  onChange={e => setNovoLead(p => ({ ...p, valor_estimado: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowNovoLead(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovoLead}
                disabled={salvando || !novoLead.nome_responsavel.trim()}
                className="flex-1 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
