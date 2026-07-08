'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/formatters'
import { Plus, ShoppingBag, ChevronRight, Pencil, Check, X, Search, Archive } from 'lucide-react'
import Link from 'next/link'

// ── status ativos (tela principal) vs finalizados (histórico) ────────
const STATUS_ATIVOS   = ['orcamento', 'aprovado', 'aguardando_fotos', 'producao', 'enviado', 'finalizado']
const STATUS_FINALIZADOS = ['entregue', 'cancelado']
const STATUS_ORDEM_KANBAN = ['orcamento', 'aprovado', 'aguardando_fotos', 'producao', 'enviado', 'finalizado']

// ── lógica de próximo status (preservada do original) ─────────────────
function proximoStatus(pedido: any): string | null {
  const { status, transportadora } = pedido
  if (status === 'aguardando_fotos') return 'producao'
  if (status === 'producao') return transportadora ? 'enviado' : 'entregue'
  if (status === 'enviado') return 'entregue'
  if (status === 'orcamento') return 'producao'
  if (status === 'aprovado') return 'producao'
  if (status === 'finalizado') return 'entregue'
  return null
}

const LABEL_ACAO: Record<string, string> = {
  producao: 'Iniciar Produção',
  enviado: 'Marcar Enviado',
  entregue: 'Confirmar Entrega',
}

// ── cálculo de urgência por data de entrega ───────────────────────────
function calcDiasEntrega(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil(
    (new Date(dateStr + 'T12:00:00').getTime() - new Date().setHours(12, 0, 0, 0)) /
    (1000 * 60 * 60 * 24)
  )
}

function urgenciaBorda(dias: number | null): string {
  if (dias === null) return 'border-gray-100'
  if (dias < 0)  return 'border-red-400'
  if (dias === 0) return 'border-red-300'
  if (dias <= 2) return 'border-yellow-300'
  return 'border-gray-100'
}

function urgenciaDot(dias: number | null): string {
  if (dias === null) return 'hidden'
  if (dias < 0)  return 'bg-red-500 animate-pulse'
  if (dias === 0) return 'bg-red-400'
  if (dias <= 2) return 'bg-yellow-400'
  return 'bg-green-400'
}

function urgenciaDataLabel(dias: number | null, dateStr: string): string {
  if (dias === null) return ''
  if (dias < 0)  return `${Math.abs(dias)}d atraso`
  if (dias === 0) return 'hoje'
  return formatDate(dateStr)
}

function urgenciaDataCor(dias: number | null): string {
  if (dias === null) return 'text-gray-400'
  if (dias < 0)  return 'text-red-600 font-bold'
  if (dias === 0) return 'text-red-500 font-bold'
  if (dias <= 2) return 'text-yellow-600 font-semibold'
  return 'text-gray-400'
}

// ── card individual ───────────────────────────────────────────────────
function PedidoCard({
  pedido, atualizando, editandoObs, obsTemp,
  onAvancar, onIniciarObs, onSalvarObs, onCancelarObs, onChangeObs,
}: any) {
  const router = useRouter()
  const dias    = calcDiasEntrega(pedido.data_entrega)
  const proximo = proximoStatus(pedido)

  return (
    <div
      className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden cursor-pointer transition-all active:scale-[0.99] ${urgenciaBorda(dias)}`}
      onClick={() => router.push(`/pedidos/${pedido.id}`)}
    >
      {/* corpo */}
      <div className="p-3.5">

        {/* linha 1 — número · status · dot urgência */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400">#{pedido.numero}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[pedido.status]}`}>
              {STATUS_LABELS[pedido.status]}
            </span>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${urgenciaDot(dias)}`} />
        </div>

        {/* linha 2 — cliente */}
        <p className="font-bold text-gray-900 text-sm leading-tight mb-2">{pedido.clientes?.nome}</p>

        {/* linha 3 — ímãs · valor · data entrega */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {pedido.qtd_imas > 0 && (
              <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {pedido.qtd_imas} ímãs
              </span>
            )}
            <span className={`text-sm font-bold ${pedido.tipo === 'mimo' ? 'text-pink-500' : 'text-gray-800'}`}>
              {pedido.tipo === 'mimo' ? 'Mimo' : formatCurrency(pedido.valor_recebido ?? pedido.valor_total)}
            </span>
          </div>
          {pedido.data_entrega && (
            <span className={`text-[11px] ${urgenciaDataCor(dias)}`}>
              {urgenciaDataLabel(dias, pedido.data_entrega)}
            </span>
          )}
        </div>
      </div>

      {/* observação inline */}
      <div className="px-3.5 pb-1" onClick={e => e.stopPropagation()}>
        {editandoObs === pedido.id ? (
          <div className="flex gap-2 items-center">
            <input
              autoFocus
              value={obsTemp}
              onChange={e => onChangeObs(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#b5005e]"
              placeholder="Observação..."
              onKeyDown={e => {
                if (e.key === 'Enter') onSalvarObs(pedido.id)
                if (e.key === 'Escape') onCancelarObs()
              }}
            />
            <button
              onClick={() => onSalvarObs(pedido.id)}
              className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center"
            >
              <Check size={13} className="text-green-700" />
            </button>
            <button
              onClick={onCancelarObs}
              className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center"
            >
              <X size={13} className="text-gray-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onIniciarObs(pedido, e) }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
          >
            <Pencil size={11} />
            {pedido.observacoes
              ? <span className="text-gray-500 italic truncate max-w-[220px]">{pedido.observacoes}</span>
              : <span>Adicionar observação...</span>}
          </button>
        )}
      </div>

      {/* footer — avançar status · abrir pedido */}
      <div className="flex border-t border-gray-100 mt-1" onClick={e => e.stopPropagation()}>
        {proximo && (
          <button
            onClick={() => onAvancar(pedido)}
            disabled={atualizando === pedido.id}
            className="flex-1 py-2.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 truncate px-2"
          >
            {atualizando === pedido.id ? '...' : (LABEL_ACAO[proximo] || STATUS_LABELS[proximo])}
          </button>
        )}
        <button
          onClick={() => router.push(`/pedidos/${pedido.id}`)}
          className={`flex items-center gap-1 px-3 py-2.5 text-xs font-bold text-[#b5005e] bg-pink-50 hover:bg-pink-100 transition-colors shrink-0 ${!proximo ? 'flex-1 justify-center' : ''}`}
        >
          Abrir <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ── página principal ──────────────────────────────────────────────────
export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editandoObs, setEditandoObs] = useState<string | null>(null)
  const [obsTemp, setObsTemp] = useState('')
  const [atualizando, setAtualizando] = useState<string | null>(null)

  // ── filtros (puramente de display, não alteram dados) ─────────────
  const [aba, setAba] = useState<'ativos' | 'finalizados'>('ativos')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')   // '' | '7' | '30'

  // ── carregamento (sem filtro de status — todos os pedidos) ────────
  async function carregar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase
      .from('usuarios').select('empresa_id').eq('id', user!.id).single()
    const { data } = await supabase
      .from('pedidos')
      .select('*, clientes(nome, whatsapp)')
      .eq('empresa_id', usuario!.empresa_id)
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  // ── ações (preservadas integralmente) ─────────────────────────────
  async function avancarStatus(pedido: any) {
    const proximo = proximoStatus(pedido)
    if (!proximo) return
    setAtualizando(pedido.id)
    const supabase = createClient()
    await supabase.from('pedidos').update({ status: proximo }).eq('id', pedido.id)
    await carregar()
    setAtualizando(null)
  }

  async function salvarObs(pedidoId: string) {
    const supabase = createClient()
    await supabase.from('pedidos').update({ observacoes: obsTemp }).eq('id', pedidoId)
    setEditandoObs(null)
    await carregar()
  }

  function iniciarEditObs(pedido: any, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditandoObs(pedido.id)
    setObsTemp(pedido.observacoes || '')
  }

  // ── derivados ─────────────────────────────────────────────────────
  const pedidosAtivos      = pedidos.filter(p => STATUS_ATIVOS.includes(p.status))
  const pedidosFinalizados = pedidos.filter(p => STATUS_FINALIZADOS.includes(p.status))

  // resumo operacional
  const totalAtivos   = pedidosAtivos.length
  const valorAtivos   = pedidosAtivos.reduce((s, p) => s + Number(p.valor_recebido ?? p.valor_total ?? 0), 0)
  const ctAguardando  = pedidosAtivos.filter(p => p.status === 'aguardando_fotos').length
  const ctProducao    = pedidosAtivos.filter(p => p.status === 'producao').length
  const ctEnviado     = pedidosAtivos.filter(p => p.status === 'enviado').length

  // filtros aplicados (apenas display)
  function aplicarFiltros(lista: any[]): any[] {
    return lista.filter(p => {
      // busca por nome ou número
      if (busca.trim()) {
        const q = busca.toLowerCase()
        const nomeOk = p.clientes?.nome?.toLowerCase().includes(q)
        const numOk  = String(p.numero ?? '').includes(q)
        if (!nomeOk && !numOk) return false
      }
      // filtro de status
      if (filtroStatus && p.status !== filtroStatus) return false
      // filtro de período (por created_at)
      if (filtroPeriodo) {
        const corte = new Date()
        corte.setDate(corte.getDate() - parseInt(filtroPeriodo))
        if (new Date(p.created_at) < corte) return false
      }
      return true
    })
  }

  const ativosFiltrados      = aplicarFiltros(pedidosAtivos)
  const finalizadosFiltrados = aplicarFiltros(pedidosFinalizados)
  const listaAtual           = aba === 'ativos' ? ativosFiltrados : finalizadosFiltrados
  const temFiltros           = !!(busca.trim() || filtroStatus || filtroPeriodo)

  const statusOpcoes = aba === 'ativos'
    ? STATUS_ATIVOS
    : STATUS_FINALIZADOS

  const cardProps = {
    atualizando,
    editandoObs,
    obsTemp,
    onAvancar: avancarStatus,
    onIniciarObs: iniciarEditObs,
    onSalvarObs: salvarObs,
    onCancelarObs: () => setEditandoObs(null),
    onChangeObs: setObsTemp,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#b5005e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 pb-28">

      {/* ── CABEÇALHO ── */}
      <div className="flex items-center justify-between pt-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          {totalAtivos > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {totalAtivos} ativo{totalAtivos !== 1 ? 's' : ''} · {formatCurrency(valorAtivos)}
            </p>
          )}
        </div>
        <Link
          href="/pedidos/novo"
          className="flex items-center gap-1.5 bg-[#b5005e] text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-pink-200 active:scale-95 transition-all"
        >
          <Plus size={15} /> Novo
        </Link>
      </div>

      {/* ── RESUMO OPERACIONAL (visível apenas na aba ativos) ── */}
      {aba === 'ativos' && totalAtivos > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div
            className={`rounded-xl p-3 text-center border cursor-pointer transition-all ${filtroStatus === 'aguardando_fotos' ? 'bg-yellow-400 border-yellow-400' : 'bg-yellow-50 border-yellow-100 hover:bg-yellow-100'}`}
            onClick={() => setFiltroStatus(filtroStatus === 'aguardando_fotos' ? '' : 'aguardando_fotos')}
          >
            <p className={`text-xl font-bold ${filtroStatus === 'aguardando_fotos' ? 'text-white' : 'text-yellow-700'}`}>{ctAguardando}</p>
            <p className={`text-[10px] font-bold leading-tight mt-0.5 ${filtroStatus === 'aguardando_fotos' ? 'text-white' : 'text-yellow-600'}`}>Ag. Fotos</p>
          </div>
          <div
            className={`rounded-xl p-3 text-center border cursor-pointer transition-all ${filtroStatus === 'producao' ? 'bg-purple-500 border-purple-500' : 'bg-purple-50 border-purple-100 hover:bg-purple-100'}`}
            onClick={() => setFiltroStatus(filtroStatus === 'producao' ? '' : 'producao')}
          >
            <p className={`text-xl font-bold ${filtroStatus === 'producao' ? 'text-white' : 'text-purple-700'}`}>{ctProducao}</p>
            <p className={`text-[10px] font-bold leading-tight mt-0.5 ${filtroStatus === 'producao' ? 'text-white' : 'text-purple-600'}`}>Produção</p>
          </div>
          <div
            className={`rounded-xl p-3 text-center border cursor-pointer transition-all ${filtroStatus === 'enviado' ? 'bg-blue-500 border-blue-500' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
            onClick={() => setFiltroStatus(filtroStatus === 'enviado' ? '' : 'enviado')}
          >
            <p className={`text-xl font-bold ${filtroStatus === 'enviado' ? 'text-white' : 'text-blue-700'}`}>{ctEnviado}</p>
            <p className={`text-[10px] font-bold leading-tight mt-0.5 ${filtroStatus === 'enviado' ? 'text-white' : 'text-blue-600'}`}>Enviados</p>
          </div>
        </div>
      )}

      {/* ── ABAS ── */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setAba('ativos'); setFiltroStatus('') }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            aba === 'ativos'
              ? 'bg-[#b5005e] text-white shadow-sm shadow-pink-200'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Em andamento
          {totalAtivos > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${aba === 'ativos' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {totalAtivos}
            </span>
          )}
        </button>
        <button
          onClick={() => { setAba('finalizados'); setFiltroStatus('') }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            aba === 'finalizados'
              ? 'bg-gray-800 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Archive size={13} />
          Histórico
          {pedidosFinalizados.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${aba === 'finalizados' ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {pedidosFinalizados.length}
            </span>
          )}
        </button>
      </div>

      {/* ── BUSCA E FILTROS ── */}
      <div className="space-y-2 mb-5">
        {/* busca */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou número..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* filtros em linha */}
        <div className="flex gap-2">
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="">Todos os status</option>
            {statusOpcoes.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={filtroPeriodo}
            onChange={e => setFiltroPeriodo(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="">Todo período</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </div>

        {/* limpar filtros */}
        {temFiltros && (
          <button
            onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroPeriodo('') }}
            className="w-full py-1.5 text-xs font-semibold text-[#b5005e] hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── LISTA ── */}
      {listaAtual.length === 0 ? (
        <div className="text-center py-16">
          {temFiltros ? (
            <>
              <Search size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">Nenhum pedido encontrado</p>
              <p className="text-xs text-gray-400 mt-1">Tente ajustar os filtros</p>
              <button
                onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroPeriodo('') }}
                className="mt-4 text-[#b5005e] text-sm font-bold"
              >
                Limpar filtros
              </button>
            </>
          ) : aba === 'ativos' ? (
            <>
              <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">Nenhum pedido ativo</p>
              <Link
                href="/pedidos/novo"
                className="inline-block mt-4 bg-[#b5005e] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm shadow-pink-200"
              >
                Criar pedido
              </Link>
            </>
          ) : (
            <>
              <Archive size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-semibold">Nenhum pedido no histórico ainda</p>
            </>
          )}
        </div>
      ) : aba === 'ativos' ? (

        /* ── KANBAN AGRUPADO POR STATUS ── */
        <div className="space-y-6">
          {STATUS_ORDEM_KANBAN.map(status => {
            const grupo = ativosFiltrados.filter(p => p.status === status)
            if (grupo.length === 0) return null
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{grupo.length}</span>
                </div>
                <div className="space-y-2.5">
                  {grupo.map(p => (
                    <PedidoCard key={p.id} pedido={p} {...cardProps} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

      ) : (

        /* ── HISTÓRICO (lista simples) ── */
        <div className="space-y-2.5">
          {finalizadosFiltrados.map(p => (
            <PedidoCard key={p.id} pedido={p} {...cardProps} />
          ))}
        </div>

      )}
    </div>
  )
}
