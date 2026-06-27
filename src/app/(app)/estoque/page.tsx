'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, AlertTriangle, Package, History, Clock, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { garantirInsumos, TIPOS_IMA } from '@/lib/utils/estoque'

export default function EstoquePage() {
  const [tab, setTab] = useState<'insumos' | 'historico'>('insumos')
  const [insumos, setInsumos] = useState<any[]>([])
  const [lotesPendentes, setLotesPendentes] = useState<Record<string, any[]>>({})
  const [movimentacoes, setMovimentacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [editMin, setEditMin] = useState('')

  async function carregar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
    const empresaId = usuario!.empresa_id

    await garantirInsumos(supabase, empresaId)

    const [{ data: ins }, { data: mov }, { data: lotesPend }] = await Promise.all([
      supabase.from('insumos').select('*').eq('empresa_id', empresaId).order('nome'),
      supabase
        .from('movimentacoes_estoque')
        .select('*, insumos(nome, unidade)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('lotes_estoque')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: true }),
    ])

    const pendMap: Record<string, any[]> = {}
    ;(lotesPend || []).forEach((l: any) => {
      if (!pendMap[l.insumo_id]) pendMap[l.insumo_id] = []
      pendMap[l.insumo_id].push(l)
    })

    setInsumos(ins || [])
    setLotesPendentes(pendMap)
    setMovimentacoes(mov || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvarMinimo(insumoId: string) {
    const supabase = createClient()
    await supabase.from('insumos').update({ estoque_minimo: parseFloat(editMin) || 0 }).eq('id', insumoId)
    setEditando(null)
    await carregar()
  }

  const alertas = insumos.filter(i => Number(i.quantidade) < Number(i.estoque_minimo) && Number(i.estoque_minimo) > 0)
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const insumoIma = insumos.filter(i => TIPOS_IMA.includes(i.tipo))
  const insumoEmbalagem = insumos.filter(i => !TIPOS_IMA.includes(i.tipo))

  // Capacidade real: mínimo entre os 4 componentes do ímã
  const capacidadeImas = insumoIma.length === 4
    ? Math.floor(Math.min(...insumoIma.map(i => Number(i.quantidade || 0))))
    : null

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  function InsumoCard({ insumo }: { insumo: any }) {
    const qtd = Number(insumo.quantidade)
    const min = Number(insumo.estoque_minimo)
    const baixo = min > 0 && qtd < min
    const pendentes = lotesPendentes[insumo.id] || []
    const proximoLote = pendentes[0]

    return (
      <div className={`bg-white rounded-2xl border shadow-sm p-4 ${baixo ? 'border-orange-200' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-gray-900">{insumo.nome}</p>
              {baixo && (
                <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">
                  ⚠️ BAIXO
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${baixo ? 'text-orange-600' : 'text-gray-900'}`}>
                {insumo.unidade === 'folha' ? Number(qtd).toFixed(1) : Number(qtd).toFixed(0)}
              </span>
              <span className="text-sm text-gray-400">{insumo.unidade}{qtd !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex gap-3 mt-1.5 flex-wrap">
              {insumo.custo_unitario > 0 && (
                <span className="text-xs text-gray-500">
                  Custo: {fmt(Number(insumo.custo_unitario))}/un
                </span>
              )}
              {editando === insumo.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">Mín:</span>
                  <input
                    type="number"
                    value={editMin}
                    onChange={e => setEditMin(e.target.value)}
                    className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs"
                    autoFocus
                  />
                  <button onClick={() => salvarMinimo(insumo.id)} className="text-xs text-green-600 font-semibold">✓</button>
                  <button onClick={() => setEditando(null)} className="text-xs text-gray-400">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditando(insumo.id); setEditMin(String(insumo.estoque_minimo)) }}
                  className="text-xs text-gray-400 underline"
                >
                  Mín: {Number(insumo.estoque_minimo).toFixed(0)} {insumo.unidade}
                </button>
              )}
            </div>
          </div>
        </div>
        {proximoLote && (
          <div className="mt-3 bg-orange-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <Clock size={13} className="text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-orange-700">
                {pendentes.length} lote{pendentes.length > 1 ? 's' : ''} pendente{pendentes.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-orange-600">
                Próximo: {proximoLote.quantidade_inicial.toFixed(0)} un
                {proximoLote.custo_unitario ? ` · ${fmt(Number(proximoLote.custo_unitario))}/un` : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 pb-32">
      <div className="flex items-center gap-3 pt-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Estoque</h1>
      </div>

      {/* Card: Capacidade de ímãs */}
      {capacidadeImas !== null && (
        <div className={`rounded-2xl p-4 mb-4 ${capacidadeImas === 0 ? 'bg-red-50 border border-red-200' : capacidadeImas < 30 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 ${capacidadeImas === 0 ? 'text-red-500' : capacidadeImas < 30 ? 'text-orange-500' : 'text-green-600'}">
            🧲 Capacidade de Produção
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${capacidadeImas === 0 ? 'text-red-600' : capacidadeImas < 30 ? 'text-orange-600' : 'text-green-700'}`}>
              {capacidadeImas}
            </span>
            <span className="text-base text-gray-500">ímãs você consegue fazer agora</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Limitado pelo componente com menor estoque entre os 4
          </p>
        </div>
      )}

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <p className="text-sm font-semibold text-orange-700">Estoque Baixo</p>
          </div>
          <div className="space-y-1">
            {alertas.map(i => (
              <p key={i.id} className="text-xs text-orange-600">
                • {i.nome}: {Number(i.quantidade).toFixed(0)} {i.unidade}
                (mínimo: {Number(i.estoque_minimo).toFixed(0)})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('insumos')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'insumos' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          <Package size={15} /> Insumos
        </button>
        <button
          onClick={() => setTab('historico')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'historico' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          <History size={15} /> Histórico
        </button>
      </div>

      {tab === 'insumos' && (
        <div className="space-y-5">
          {insumoIma.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                🧲 Componentes do Ímã
              </p>
              <div className="space-y-2">
                {insumoIma.map(insumo => <InsumoCard key={insumo.id} insumo={insumo} />)}
              </div>
            </div>
          )}
          {insumoEmbalagem.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                📦 Embalagem
              </p>
              <div className="space-y-2">
                {insumoEmbalagem.map(insumo => <InsumoCard key={insumo.id} insumo={insumo} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'historico' && (
        <div>
          {movimentacoes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-10">Nenhuma movimentação registrada</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
              {movimentacoes.map(m => (
                <div key={m.id} className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        m.tipo === 'entrada'
                          ? 'bg-green-100 text-green-700'
                          : m.observacoes?.includes('Descarte')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {m.tipo === 'entrada' ? '↑ Entrada' : m.observacoes?.includes('Descarte') ? '🗑 Descarte' : '↓ Saída'}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {m.insumos?.nome}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {m.observacoes && ` · ${m.observacoes}`}
                    </p>
                    {m.valor_pago && (
                      <p className="text-xs text-gray-500">{fmt(Number(m.valor_pago))}</p>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <p className={`text-base font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-orange-600'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'}
                      {Number(m.quantidade) % 1 === 0
                        ? Number(m.quantidade).toFixed(0)
                        : Number(m.quantidade).toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-400">{m.insumos?.unidade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botões flutuantes */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2 items-end">
        <Link
          href="/estoque/descarte"
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-2xl shadow-lg font-semibold text-sm"
        >
          <Trash2 size={16} />
          Descarte
        </Link>
        <Link
          href="/estoque/entrada"
          className="flex items-center gap-2 bg-green-600 text-white px-5 py-3.5 rounded-2xl shadow-lg font-semibold text-sm"
        >
          <Plus size={18} />
          Entrada de Estoque
        </Link>
      </div>
    </div>
  )
}
