'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, ClipboardList, CheckCircle, Circle } from 'lucide-react'

const CATEGORIAS = [
  { id: 'preparacao', label: 'Preparação', cor: 'bg-blue-100 text-blue-700' },
  { id: 'no_dia', label: 'No dia', cor: 'bg-orange-100 text-orange-700' },
  { id: 'pos_evento', label: 'Pós-evento', cor: 'bg-green-100 text-green-700' },
]

const ITENS_PADRAO = [
  { item: 'Confirmar data e horário com o cliente', categoria: 'preparacao' },
  { item: 'Verificar estoque de fotoímãs', categoria: 'preparacao' },
  { item: 'Preparar equipamentos', categoria: 'preparacao' },
  { item: 'Confirmar endereço do evento', categoria: 'preparacao' },
  { item: 'Carregar bateria dos equipamentos', categoria: 'no_dia' },
  { item: 'Montar estande', categoria: 'no_dia' },
  { item: 'Testar impressora', categoria: 'no_dia' },
  { item: 'Desmontagem e limpeza', categoria: 'no_dia' },
  { item: 'Enviar fotos ao cliente', categoria: 'pos_evento' },
  { item: 'Solicitar avaliação/feedback', categoria: 'pos_evento' },
  { item: 'Atualizar financeiro', categoria: 'pos_evento' },
]

export default function ChecklistsPage() {
  const [eventos, setEventos] = useState<any[]>([])
  const [eventoSelecionado, setEventoSelecionado] = useState('')
  const [checklists, setChecklists] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [novoItem, setNovoItem] = useState('')
  const [categoriaItem, setCategoriaItem] = useState('preparacao')
  const [salvando, setSalvando] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function carregarEventos() {
      const { data } = await supabase.from('eventos').select('id,nome_evento,data_evento').order('data_evento', { ascending: false }).limit(20)
      setEventos(data || [])
    }
    carregarEventos()
  }, [])

  const carregarChecklist = useCallback(async (evId: string) => {
    setLoading(true)
    const { data } = await supabase.from('eventos_checklists').select('*').eq('evento_id', evId).order('categoria').order('ordem')
    setChecklists(data || [])
    setLoading(false)
  }, [])

  async function selecionarEvento(evId: string) {
    setEventoSelecionado(evId)
    await carregarChecklist(evId)
  }

  async function criarChecklistPadrao() {
    if (!eventoSelecionado) return
    setSalvando(true)
    const items = ITENS_PADRAO.map((item, i) => ({
      evento_id: eventoSelecionado,
      ...item,
      ordem: i,
      concluido: false,
    }))
    await supabase.from('eventos_checklists').insert(items)
    await carregarChecklist(eventoSelecionado)
    setSalvando(false)
  }

  async function adicionarItem() {
    if (!novoItem.trim() || !eventoSelecionado) return
    setSalvando(true)
    await supabase.from('eventos_checklists').insert({
      evento_id: eventoSelecionado,
      item: novoItem.trim(),
      categoria: categoriaItem,
      ordem: checklists.length,
      concluido: false,
    })
    await carregarChecklist(eventoSelecionado)
    setNovoItem('')
    setSalvando(false)
  }

  async function toggleItem(id: string, concluido: boolean) {
    setChecklists(prev => prev.map(i => i.id === id ? { ...i, concluido: !concluido } : i))
    await supabase.from('eventos_checklists').update({
      concluido: !concluido,
      concluido_em: !concluido ? new Date().toISOString() : null,
    }).eq('id', id)
  }

  const por_categoria = CATEGORIAS.map(cat => ({
    ...cat,
    items: checklists.filter(c => c.categoria === cat.id),
  }))

  const totalConcluido = checklists.filter(c => c.concluido).length

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-purple-900">Checklists de Eventos</h1>
        <p className="text-xs text-purple-500">Controle de tarefas por evento</p>
      </div>

      {/* Seletor de evento */}
      <div>
        <label className="text-xs font-medium text-gray-600">Selecione o evento</label>
        <select
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400"
          value={eventoSelecionado}
          onChange={e => selecionarEvento(e.target.value)}
        >
          <option value="">Escolha um evento...</option>
          {eventos.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.nome_evento} {ev.data_evento ? `— ${new Date(ev.data_evento + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
            </option>
          ))}
        </select>
      </div>

      {eventoSelecionado && !loading && (
        <>
          {checklists.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-dashed border-gray-200">
              <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm mb-4">Nenhum item no checklist</p>
              <button
                onClick={criarChecklistPadrao}
                disabled={salvando}
                className="bg-purple-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm"
              >
                {salvando ? 'Criando...' : 'Criar checklist padrão'}
              </button>
            </div>
          ) : (
            <>
              {/* Progresso */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">Progresso</span>
                  <span className="text-purple-600 font-semibold">{totalConcluido}/{checklists.length}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${checklists.length ? (totalConcluido / checklists.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Items por categoria */}
              {por_categoria.map(cat => (
                <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${cat.cor}`}>{cat.label}</span>
                    <span className="text-xs text-gray-400">{cat.items.filter(i => i.concluido).length}/{cat.items.length}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {cat.items.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-gray-400">Nenhum item</p>
                    ) : (
                      cat.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(item.id, item.concluido)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          {item.concluido ? (
                            <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle size={18} className="text-gray-300 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${item.concluido ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {item.item}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Adicionar item */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Adicionar item</h3>
            <div>
              <input
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400"
                value={novoItem}
                onChange={e => setNovoItem(e.target.value)}
                placeholder="Descrição do item..."
                onKeyDown={e => e.key === 'Enter' && adicionarItem()}
              />
            </div>
            <div className="flex gap-2">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaItem(cat.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoriaItem === cat.id ? cat.cor : 'bg-gray-100 text-gray-500'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <button
              onClick={adicionarItem}
              disabled={salvando || !novoItem.trim()}
              className="w-full bg-purple-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>
        </>
      )}
    </div>
  )
}
