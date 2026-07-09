'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, AlertTriangle, Package, History, Clock, Trash2, Search, X, ChevronRight, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { garantirInsumos, TIPOS_IMA, calcularConsumo } from '@/lib/utils/estoque'

// ── status do insumo ───────────────────────────────────────────────────
function calcStatus(insumo: any): 'normal' | 'baixo' | 'critico' {
  const qtd = Number(insumo.quantidade)
  const min = Number(insumo.estoque_minimo)
  if (qtd === 0 || (min > 0 && qtd < min * 0.5)) return 'critico'
  if (min > 0 && qtd < min) return 'baixo'
  return 'normal'
}

const STATUS_CFG = {
  normal:  { label: 'Normal',  dot: 'bg-green-500',             badge: 'bg-green-100 text-green-700',   borda: 'border-gray-100' },
  baixo:   { label: 'Baixo',   dot: 'bg-yellow-500',            badge: 'bg-yellow-100 text-yellow-700', borda: 'border-yellow-200' },
  critico: { label: 'Crítico', dot: 'bg-red-500 animate-pulse', badge: 'bg-red-100 text-red-700',       borda: 'border-red-300' },
}

// ── capacidade de produção por kit ─────────────────────────────────────
// Usa SOMENTE os 4 componentes do ímã (1 de cada por ímã no kit)
const TIPOS_IMA_CAP = ['ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao']

function calcCapacidadeKit(qtdImasKit: number, insumos: any[]): number {
  const map = Object.fromEntries(insumos.map(i => [i.tipo, i]))
  let min = Infinity
  for (const tipo of TIPOS_IMA_CAP) {
    const disp = Number(map[tipo]?.quantidade || 0)
    const cap  = Math.floor(disp / qtdImasKit)
    if (cap < min) min = cap
  }
  return min === Infinity ? 0 : min
}

export default function EstoquePage() {
  const router = useRouter()
  const [tab, setTab] = useState<'insumos' | 'historico'>('insumos')
  const [insumos, setInsumos] = useState<any[]>([])
  const [lotesPendentes, setLotesPendentes] = useState<Record<string, any[]>>({})
  const [movimentacoes, setMovimentacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [editMin, setEditMin] = useState('')
  // kits baseados nos produtos cadastrados
  const [produtosKit, setProdutosKit] = useState<{nome: string, qtdImas: number}[]>([])
  // filtros (só visual)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'imas' | 'embalagem'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'normal' | 'baixo' | 'critico'>('todos')

  // ── carregamento (preservado integralmente) ────────────────────────
  async function carregar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
    const empresaId = usuario!.empresa_id

    await garantirInsumos(supabase, empresaId)

    const [{ data: ins }, { data: mov }, { data: lotesPend }, { data: prods }] = await Promise.all([
      supabase.from('insumos').select('*').eq('empresa_id', empresaId).order('nome'),
      supabase
        .from('movimentacoes_estoque')
        .select('*, insumos(nome, unidade)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('lotes_estoque')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('status', 'pendente')
        .order('created_at', { ascending: true }),
      // produtos cadastrados — base para capacidade de produção
      supabase
        .from('produtos')
        .select('nome')
        .eq('empresa_id', empresaId)
        .eq('ativo', true),
    ])

    // extrai quantidade de ímãs do nome do produto (ex: "Kit 12 Ímãs" → 12)
    const kitsExtraidos: {nome: string, qtdImas: number}[] = []
    ;(prods || []).forEach((p: any) => {
      const match = p.nome.match(/\d+/)
      if (match) {
        const qtd = Number(match[0])
        if (qtd > 0 && !kitsExtraidos.find(k => k.qtdImas === qtd)) {
          kitsExtraidos.push({ nome: p.nome, qtdImas: qtd })
        }
      }
    })
    kitsExtraidos.sort((a, b) => a.qtdImas - b.qtdImas)
    setProdutosKit(kitsExtraidos)

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

  // ── salvar mínimo (preservado integralmente) ───────────────────────
  async function salvarMinimo(insumoId: string) {
    const supabase = createClient()
    await supabase.from('insumos').update({ estoque_minimo: parseFloat(editMin) || 0 }).eq('id', insumoId)
    setEditando(null)
    await carregar()
  }

  // ── derivados ──────────────────────────────────────────────────────
  const alertas = insumos.filter(i => calcStatus(i) !== 'normal')
  const qtdBaixo = alertas.length
  const valorInvestido = insumos.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.custo_unitario || 0), 0)
  const ultimaMov = movimentacoes[0]

  // última entrada por insumo (para exibição no card)
  const ultimaEntradaPorInsumo = useMemo(() => {
    const map: Record<string, any> = {}
    movimentacoes.forEach(m => {
      if (m.tipo === 'entrada' && !map[m.insumo_id]) map[m.insumo_id] = m
    })
    return map
  }, [movimentacoes])

  // capacidade por kit — baseada nos produtos cadastrados
  const capacidadeKits = useMemo(() =>
    produtosKit.map(p => ({
      nome: p.nome,
      qtdImas: p.qtdImas,
      capacidade: calcCapacidadeKit(p.qtdImas, insumos),
    })),
    [produtosKit, insumos]
  )

  // categorias
  const insumoIma      = insumos.filter(i => TIPOS_IMA.includes(i.tipo))
  const insumoEmbalagem = insumos.filter(i => !TIPOS_IMA.includes(i.tipo))

  // filtros combinados
  const insumosVisiveis = useMemo(() => {
    let lista = insumos
    if (filtroCategoria === 'imas')      lista = lista.filter(i => TIPOS_IMA.includes(i.tipo))
    if (filtroCategoria === 'embalagem') lista = lista.filter(i => !TIPOS_IMA.includes(i.tipo))
    if (filtroStatus !== 'todos')        lista = lista.filter(i => calcStatus(i) === filtroStatus)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      lista = lista.filter(i => i.nome.toLowerCase().includes(q))
    }
    return lista
  }, [insumos, filtroCategoria, filtroStatus, busca])

  const temFiltros = !!(busca || filtroCategoria !== 'todos' || filtroStatus !== 'todos')
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // ── InsumoCard ─────────────────────────────────────────────────────
  function InsumoCard({ insumo }: { insumo: any }) {
    const qtd       = Number(insumo.quantidade)
    const min       = Number(insumo.estoque_minimo)
    const status    = calcStatus(insumo)
    const cfg       = STATUS_CFG[status]
    const pendentes = lotesPendentes[insumo.id] || []
    const proximoLote = pendentes[0]
    const ultimaEntrada = ultimaEntradaPorInsumo[insumo.id]

    return (
      <div
        className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-all ${cfg.borda}`}
        onClick={() => router.push(`/estoque/${insumo.id}`)}
      >
        <div className="p-4">
          {/* header: nome + status badge */}
          <div className="flex items-start justify-between mb-2">
            <p className="font-bold text-gray-900 leading-tight flex-1 pr-2">{insumo.nome}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            </div>
          </div>

          {/* quantidade */}
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className={`text-3xl font-bold ${
              status === 'critico' ? 'text-red-600' :
              status === 'baixo'   ? 'text-yellow-600' : 'text-gray-900'
            }`}>
              {insumo.unidade === 'folha' ? qtd.toFixed(1) : qtd.toFixed(0)}
            </span>
            <span className="text-sm text-gray-400">{insumo.unidade}{qtd !== 1 ? 's' : ''}</span>
          </div>

          {/* métricas de apoio */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
            {min > 0 && (
              <span>
                Mín:{' '}
                {editando === insumo.id ? (
                  <span onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      value={editMin}
                      onChange={e => setEditMin(e.target.value)}
                      className="w-14 border border-gray-200 rounded px-1 py-0.5 text-xs"
                      autoFocus
                    />
                    <button onClick={e => { e.stopPropagation(); salvarMinimo(insumo.id) }} className="text-green-600 font-bold">✓</button>
                    <button onClick={e => { e.stopPropagation(); setEditando(null) }} className="text-gray-400">✕</button>
                  </span>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setEditando(insumo.id); setEditMin(String(insumo.estoque_minimo)) }}
                    className="underline text-gray-400 hover:text-gray-600"
                  >
                    {Number(min).toFixed(0)} {insumo.unidade}
                  </button>
                )}
              </span>
            )}
            {insumo.custo_unitario > 0 && <span>{fmt(Number(insumo.custo_unitario))}/un</span>}
            {ultimaEntrada && (
              <span>
                Última entrada: {new Date(ultimaEntrada.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                {ultimaEntrada.valor_pago > 0 && ` · ${fmt(Number(ultimaEntrada.valor_pago))}`}
              </span>
            )}
          </div>
        </div>

        {/* lote pendente */}
        {proximoLote && (
          <div className="px-4 pb-3">
            <div className="bg-orange-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <Clock size={12} className="text-orange-500 shrink-0" />
              <p className="text-xs text-orange-700">
                {pendentes.length} lote{pendentes.length > 1 ? 's' : ''} pendente{pendentes.length > 1 ? 's' : ''} · Próx: {proximoLote.quantidade_inicial.toFixed(0)} un
                {proximoLote.custo_unitario ? ` · ${fmt(Number(proximoLote.custo_unitario))}/un` : ''}
              </p>
            </div>
          </div>
        )}

        {/* rodapé */}
        <div className="border-t border-gray-50 px-4 py-2 flex items-center justify-end">
          <span className="text-xs text-gray-400 flex items-center gap-1">Ver detalhes <ChevronRight size={12} /></span>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 pb-32">

      {/* ── CABEÇALHO ── */}
      <div className="pt-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
        {ultimaMov && (
          <p className="text-xs text-gray-400 mt-0.5">
            Última mov.: {new Date(ultimaMov.data + 'T12:00:00').toLocaleDateString('pt-BR')} · {ultimaMov.insumos?.nome}
          </p>
        )}
      </div>

      {/* ── DASHBOARD RESUMO ── */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Insumos</p>
          <p className="text-3xl font-bold text-gray-900">{insumos.length}</p>
          <p className="text-xs text-gray-400">cadastrados</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${
          qtdBaixo > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-100'
        }`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${qtdBaixo > 0 ? 'text-red-500' : 'text-green-600'}`}>
            Atenção
          </p>
          <p className={`text-3xl font-bold ${qtdBaixo > 0 ? 'text-red-600' : 'text-green-700'}`}>{qtdBaixo}</p>
          <p className={`text-xs ${qtdBaixo > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {qtdBaixo === 0 ? 'tudo normal ✓' : `com estoque baixo`}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Investido</p>
          <p className="text-lg font-bold text-gray-900">{fmt(valorInvestido)}</p>
          <p className="text-xs text-gray-400">em estoque</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Última mov.</p>
          {ultimaMov ? (
            <>
              <p className="text-sm font-bold text-gray-900 leading-tight truncate">{ultimaMov.insumos?.nome}</p>
              <p className="text-xs text-gray-400">{new Date(ultimaMov.data + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
            </>
          ) : <p className="text-sm text-gray-400">—</p>}
        </div>
      </div>

      {/* ── ALERTAS ── */}
      {alertas.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle size={15} className="text-orange-500 shrink-0" />
            <p className="text-sm font-bold text-orange-700">
              {alertas.length} insumo{alertas.length !== 1 ? 's' : ''} abaixo do mínimo
            </p>
          </div>
          <div className="space-y-2">
            {alertas.map(i => {
              const st = calcStatus(i)
              return (
                <button
                  key={i.id}
                  onClick={() => router.push(`/estoque/${i.id}`)}
                  className="w-full flex items-center gap-2 text-left active:scale-[0.98] transition-all"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${st === 'critico' ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <p className="text-xs text-orange-700 flex-1">
                    <span className="font-semibold">{i.nome}</span>
                    {' — '}{Number(i.quantidade).toFixed(0)} {i.unidade} (mín: {Number(i.estoque_minimo).toFixed(0)})
                  </p>
                  <ChevronRight size={11} className="text-orange-400 shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CAPACIDADE DE PRODUÇÃO ── */}
      {insumos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
            <BarChart2 size={14} className="text-green-600" />
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Capacidade de Produção</p>
          </div>
          <div className="p-4">
            {capacidadeKits.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                Nenhum produto cadastrado ainda. O painel será preenchido automaticamente conforme os produtos forem criados.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  Baseado nos produtos cadastrados · limitado por placa metal, plástico, proteção e ímã
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {capacidadeKits.map(k => (
                    <div
                      key={k.qtdImas}
                      className={`rounded-xl border p-3 ${
                        k.capacidade === 0 ? 'bg-red-50 border-red-200' :
                        k.capacidade < 5  ? 'bg-yellow-50 border-yellow-200' :
                        'bg-green-50 border-green-100'
                      }`}
                    >
                      <p className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${
                        k.capacidade === 0 ? 'text-red-500' :
                        k.capacidade < 5  ? 'text-yellow-600' : 'text-green-600'
                      }`}>{k.nome}</p>
                      <p className={`text-2xl font-bold ${
                        k.capacidade === 0 ? 'text-red-600' :
                        k.capacidade < 5  ? 'text-yellow-700' : 'text-green-700'
                      }`}>{k.capacidade}</p>
                      <p className="text-[10px] text-gray-400">{k.capacidade === 1 ? 'pedido' : 'pedidos'}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">Limitado pelo insumo com menor estoque</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('insumos')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'insumos' ? 'bg-green-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          <Package size={15} />
          Insumos
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'insumos' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {insumos.length}
          </span>
        </button>
        <button
          onClick={() => setTab('historico')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'historico' ? 'bg-green-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          <History size={15} />
          Histórico
        </button>
      </div>

      {/* ── BUSCA E FILTROS (só na aba insumos) ── */}
      {tab === 'insumos' && (
        <div className="space-y-2 mb-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar insumo..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value as any)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="todos">Todas categorias</option>
              <option value="imas">🧲 Componentes do Ímã</option>
              <option value="embalagem">📦 Embalagem</option>
            </select>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as any)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="todos">Todos status</option>
              <option value="normal">🟢 Normal</option>
              <option value="baixo">🟡 Baixo</option>
              <option value="critico">🔴 Crítico</option>
            </select>
          </div>
          {temFiltros && (
            <button
              onClick={() => { setBusca(''); setFiltroCategoria('todos'); setFiltroStatus('todos') }}
              className="w-full py-1.5 text-xs font-semibold text-green-700 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* ── LISTA DE INSUMOS ── */}
      {tab === 'insumos' && (
        insumosVisiveis.length === 0 ? (
          <div className="text-center py-12">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">Nenhum insumo encontrado</p>
            {temFiltros && (
              <button
                onClick={() => { setBusca(''); setFiltroCategoria('todos'); setFiltroStatus('todos') }}
                className="mt-3 text-green-700 text-sm font-bold"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : temFiltros ? (
          // lista plana quando há filtros
          <div className="space-y-2.5">
            {insumosVisiveis.map(i => <InsumoCard key={i.id} insumo={i} />)}
          </div>
        ) : (
          // agrupado por categoria quando sem filtros
          <div className="space-y-6">
            {insumoIma.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5 px-1">🧲 Componentes do Ímã</p>
                <div className="space-y-2.5">
                  {insumoIma.map(i => <InsumoCard key={i.id} insumo={i} />)}
                </div>
              </div>
            )}
            {insumoEmbalagem.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5 px-1">📦 Embalagem</p>
                <div className="space-y-2.5">
                  {insumoEmbalagem.map(i => <InsumoCard key={i.id} insumo={i} />)}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── HISTÓRICO ── */}
      {tab === 'historico' && (
        movimentacoes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">Nenhuma movimentação registrada</p>
        ) : (
          <div className="space-y-2">
            {movimentacoes.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 flex items-start gap-3">
                {/* ícone de tipo */}
                <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                  m.tipo === 'entrada'
                    ? 'bg-green-100 text-green-700'
                    : m.observacoes?.includes('Descarte')
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {m.tipo === 'entrada' ? '↑' : m.observacoes?.includes('Descarte') ? '🗑' : '↓'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight truncate">{m.insumos?.nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {m.observacoes && ` · ${m.observacoes}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-base font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-orange-600'}`}>
                        {m.tipo === 'entrada' ? '+' : '−'}
                        {Number(m.quantidade) % 1 === 0
                          ? Number(m.quantidade).toFixed(0)
                          : Number(m.quantidade).toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-400">{m.insumos?.unidade}</p>
                    </div>
                  </div>
                  {m.valor_pago > 0 && (
                    <p className="text-xs text-gray-500 mt-1 font-medium">{fmt(Number(m.valor_pago))}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── BOTÕES FLUTUANTES ── */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2 items-end">
        <Link
          href="/estoque/descarte"
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-2xl shadow-lg font-semibold text-sm active:scale-95 transition-all"
     