'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Package } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// ── status do insumo ───────────────────────────────────────────────────
function calcStatus(qtd: number, min: number): 'normal' | 'baixo' | 'critico' {
  if (qtd === 0 || (min > 0 && qtd < min * 0.5)) return 'critico'
  if (min > 0 && qtd < min) return 'baixo'
  return 'normal'
}

const STATUS_CFG = {
  normal:  { label: 'Normal',  badge: 'bg-green-100 text-green-700',   cor: 'text-gray-900' },
  baixo:   { label: 'Baixo',   badge: 'bg-yellow-100 text-yellow-700', cor: 'text-yellow-600' },
  critico: { label: 'Crítico', badge: 'bg-red-100 text-red-700',       cor: 'text-red-600' },
}

const LOTE_STATUS_CFG: Record<string, { label: string; cor: string; fundo: string }> = {
  ativo:    { label: 'ATIVO',    cor: 'bg-green-500 text-white',  fundo: 'bg-green-50' },
  pendente: { label: 'NA FILA',  cor: 'bg-orange-400 text-white', fundo: 'bg-white' },
  esgotado: { label: 'ESGOTADO', cor: 'bg-gray-400 text-white',   fundo: 'bg-gray-50 opacity-50' },
}

export default function InsumoDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [insumo, setInsumo] = useState<any>(null)
  const [movimentacoes, setMovimentacoes] = useState<any[]>([])
  const [lotes, setLotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editandoMin, setEditandoMin] = useState(false)
  const [editMin, setEditMin] = useState('')

  async function carregar() {
    const supabase = createClient()
    const [{ data: ins }, { data: mov }, { data: lots }] = await Promise.all([
      supabase.from('insumos').select('*').eq('id', id).single(),
      supabase
        .from('movimentacoes_estoque')
        .select('*')
        .eq('insumo_id', id)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('lotes_estoque')
        .select('*')
        .eq('insumo_id', id)
        .order('created_at', { ascending: true }),
    ])
    setInsumo(ins)
    setMovimentacoes(mov || [])
    setLotes(lots || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [id])

  async function salvarMinimo() {
    const supabase = createClient()
    await supabase.from('insumos').update({ estoque_minimo: parseFloat(editMin) || 0 }).eq('id', id)
    setEditandoMin(false)
    await carregar()
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!insumo) return (
    <div className="p-4 text-center py-16">
      <p className="text-gray-500">Insumo não encontrado</p>
      <Link href="/estoque" className="text-green-600 underline mt-2 block">Voltar</Link>
    </div>
  )

  const qtd    = Number(insumo.quantidade)
  const min    = Number(insumo.estoque_minimo)
  const status = calcStatus(qtd, min)
  const cfg    = STATUS_CFG[status]

  const entradas = movimentacoes.filter(m => m.tipo === 'entrada')
  const saidas   = movimentacoes.filter(m => m.tipo === 'saida')

  const lotesAtivos    = lotes.filter(l => l.status === 'ativo')
  const lotesPendentes = lotes.filter(l => l.status === 'pendente')
  const lotesEsgotados = lotes.filter(l => l.status === 'esgotado').slice(0, 5) // últimos 5

  return (
    <div className="p-4 pb-28">

      {/* ── NAVEGAÇÃO ── */}
      <div className="flex items-center justify-between pt-4 mb-4">
        <Link href="/estoque" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <Link
          href="/estoque/entrada"
          className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all"
        >
          <Plus size={14} /> Registrar Entrada
        </Link>
      </div>

      {/* ── CABEÇALHO ── */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-0.5">
          <h1 className="text-2xl font-bold text-gray-900">{insumo.nome}</h1>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>{cfg.label}</span>
        </div>
        <p className="text-sm text-gray-400 capitalize">{insumo.tipo?.replace(/_/g, ' ')}</p>
      </div>

      {/* ── 1. ESTOQUE ATUAL ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Estoque Atual</p>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">

          {/* quantidade */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Disponível</p>
            <p className={`text-4xl font-bold ${cfg.cor}`}>
              {insumo.unidade === 'folha' ? qtd.toFixed(1) : qtd.toFixed(0)}
            </p>
            <p className="text-sm text-gray-400">{insumo.unidade}s</p>
          </div>

          {/* mínimo */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Mínimo</p>
            {editandoMin ? (
              <div className="space-y-1.5">
                <input
                  type="number"
                  value={editMin}
                  onChange={e => setEditMin(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <button onClick={salvarMinimo} className="flex-1 bg-green-600 text-white rounded-lg py-1 text-xs font-bold">Salvar</button>
                  <button onClick={() => setEditandoMin(false)} className="flex-1 bg-gray-100 rounded-lg py-1 text-xs text-gray-500">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-4xl font-bold text-gray-900">{min.toFixed(0)}</p>
                <button
                  onClick={() => { setEditandoMin(true); setEditMin(String(min)) }}
                  className="text-xs text-green-600 underline mt-0.5"
                >
                  Editar
                </button>
              </>
            )}
          </div>

          {/* custo unitário */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Custo Atual</p>
            <p className="text-xl font-bold text-gray-900">
              {insumo.custo_unitario > 0 ? fmt(Number(insumo.custo_unitario)) : '—'}
            </p>
            <p className="text-xs text-gray-400">por {insumo.unidade}</p>
          </div>

          {/* valor em estoque */}
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Valor em Estoque</p>
            <p className="text-xl font-bold text-gray-900">
              {insumo.custo_unitario > 0 ? fmt(qtd * Number(insumo.custo_unitario)) : '—'}
            </p>
          </div>
        </div>

        {/* barra de progresso relativa ao mínimo */}
        {min > 0 && (
          <div className="px-4 pb-4">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  status === 'critico' ? 'bg-red-500' :
                  status === 'baixo'   ? 'bg-yellow-400' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((qtd / min) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {Math.round((qtd / min) * 100)}% do estoque mínimo
            </p>
          </div>
        )}
      </div>

      {/* ── 2. LOTES FIFO ── */}
      {lotes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lotes (FIFO)</p>
            <span className="text-xs text-gray-400">
              {lotesPendentes.length > 0 && `${lotesPendentes.length} na fila`}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {/* ativos */}
            {lotesAtivos.map(l => (
              <div key={l.id} className="px-4 py-3 bg-green-50 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded">ATIVO</span>
                    {l.data_compra && (
                      <span className="text-xs text-gray-500">
                        {new Date(l.data_compra + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  {l.observacoes && <p className="text-xs text-gray-600">{l.observacoes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-green-700">
                    {Number(l.quantidade_restante).toFixed(0)}
                    <span className="text-xs font-normal text-gray-400 ml-1">restante</span>
                  </p>
                  <p className="text-xs text-gray-400">de {Number(l.quantidade_inicial).toFixed(0)} inicial</p>
                  {l.custo_unitario && <p className="text-xs text-gray-400">{fmt(Number(l.custo_unitario))}/un</p>}
                </div>
              </div>
            ))}

            {/* pendentes na fila */}
            {lotesPendentes.map((l, idx) => (
              <div key={l.id} className="px-4 py-3 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold bg-orange-400 text-white px-1.5 py-0.5 rounded">
                      #{idx + 1} FILA
                    </span>
                    {l.data_compra && (
                      <span className="text-xs text-gray-500">
                        {new Date(l.data_compra + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  {l.observacoes && <p className="text-xs text-gray-600">{l.observacoes}</p>}
                  <p className="text-xs text-gray-400">Aguardando lote ativo esgotar</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-orange-600">{Number(l.quantidade_inicial).toFixed(0)}</p>
                  {l.custo_unitario && <p className="text-xs text-gray-400">{fmt(Number(l.custo_unitario))}/un</p>}
                </div>
              </div>
            ))}

            {/* esgotados (últimos 5) */}
            {lotesEsgotados.length > 0 && (
              <>
                <div className="px-4 py-2 bg-gray-50">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Lotes anteriores</p>
                </div>
                {lotesEsgotados.map(l => (
                  <div key={l.id} className="px-4 py-2.5 flex justify-between items-center opacity-50">
                    <div>
                      <span className="text-[10px] font-bold bg-gray-400 text-white px-1.5 py-0.5 rounded mr-2">ESGOTADO</span>
                      {l.data_compra && (
                        <span className="text-xs text-gray-500">
                          {new Date(l.data_compra + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-500">{Number(l.quantidade_inicial).toFixed(0)}</p>
                      {l.custo_unitario && <p className="text-xs text-gray-400">{fmt(Number(l.custo_unitario))}/un</p>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 3. HISTÓRICO DE MOVIMENTAÇÕES ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Histórico</p>
          <div className="flex gap-3 text-xs">
            <span className="text-green-600 font-semibold">+{entradas.length} entradas</span>
            <span className="text-orange-500 font-semibold">−{saidas.length} saídas</span>
          </div>
        </div>

        {movimentacoes.length === 0 ? (
          <div className="py-10 text-center">
            <Package size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Nenhuma movimentação registrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {movimentacoes.map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                {/* tipo */}
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  m.tipo === 'entrada'
                    ? 'bg-green-100 text-green-700'
                    : m.observacoes?.includes('Descarte')
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {m.tipo === 'entrada' ? '↑' : m.observacoes?.includes('Descarte') ? '🗑' : '↓'}
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">
                    {new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    {m.observacoes && ` · ${m.observacoes}`}
                  </p>
                  {m.valor_pago > 0 && (
                    <p className="text-xs text-gray-500 font-medium">{fmt(Number(m.valor_pago))}</p>
                  )}
                </div>

                {/* quantidade */}
                <div className="text-right shrink-0">
                  <p className={`font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-orange-600'}`}>
                    {m.tipo === 'entrada' ? '+' : '−'}
                    {Number(m.quantidade) % 1 === 0
                      ? Number(m.quantidade).toFixed(0)
                      : Number(m.quantidade).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-gray-400">{insumo.unidade}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
