'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/formatters'
import { Plus, ShoppingBag, ChevronRight, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'

const STATUS_ORDER = ['aguardando_fotos', 'producao', 'enviado', 'entregue', 'orcamento', 'finalizado']

function proximoStatus(status: string, temTransportadora: boolean): string | null {
  if (status === 'aguardando_fotos') return 'producao'
  if (status === 'producao') return temTransportadora ? 'enviado' : 'entregue'
  if (status === 'enviado') return 'entregue'
  if (status === 'orcamento') return 'producao'
  return null
}

const LABEL_ACAO: Record<string, string> = {
  producao: 'Em Preparacao',
  enviado: 'Enviado',
  entregue: 'Entregue',
}

function diasDesde(dateStr: string): number {
  const criado = new Date(dateStr)
  const hoje = new Date()
  criado.setHours(0, 0, 0, 0)
  hoje.setHours(0, 0, 0, 0)
  return Math.floor((hoje.getTime() - criado.getTime()) / (1000 * 60 * 60 * 24))
}

function PedidoCard({ pedido, atualizando, editandoObs, obsTemp, onAvancar, onIniciarObs, onSalvarObs, onCancelarObs, onChangeObs }: any) {
  const router = useRouter()
  const temTransp = !!pedido.transportadora
  const proximo = proximoStatus(pedido.status, temTransp)

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer"
      onClick={() => router.push(`/pedidos/${pedido.id}`)}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{pedido.clientes?.nome}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            #{pedido.numero}
            {pedido.data_entrega && ` · ${formatDate(pedido.data_entrega)}`}
            {pedido.origem === 'nuvemshop' ? (
              <span className="ml-1 font-semibold text-purple-500">· Nuvemshop</span>
            ) : pedido.origem === 'whatsapp_correio' || temTransp ? (
              <span className="ml-1 text-orange-500">· WhatsApp Correio</span>
            ) : (
              <span className="ml-1 text-blue-500">· WhatsApp Local</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-base font-bold text-gray-900">
            {pedido.tipo === 'mimo' ? <span className="text-pink-500 text-sm">Mimo</span> : formatCurrency(pedido.valor_total)}
          </p>
          <ChevronRight size={16} className="text-gray-300" />
        </div>
      </div>

      <div className="px-4 pb-2" onClick={e => e.stopPropagation()}>
        {editandoObs === pedido.id ? (
          <div className="flex gap-2 items-center">
            <input
              autoFocus
              value={obsTemp}
              onChange={e => onChangeObs(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
              placeholder="Observação..."
              onKeyDown={e => { if (e.key === 'Enter') onSalvarObs(pedido.id); if (e.key === 'Escape') onCancelarObs() }}
            />
            <button onClick={() => onSalvarObs(pedido.id)} className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center"><Check size={13} className="text-green-700" /></button>
            <button onClick={onCancelarObs} className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center"><X size={13} className="text-gray-500" /></button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onIniciarObs(pedido, e) }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1"
          >
            <Pencil size={11} />
            {pedido.observacoes ? <span className="text-gray-600 italic">{pedido.observacoes}</span> : 'Adicionar observacao...'}
          </button>
        )}
      </div>

      {proximo && (
        <button
          onClick={(e) => { e.stopPropagation(); onAvancar(pedido) }}
          disabled={atualizando === pedido.id}
          className="w-full py-2.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50"
        >
          {atualizando === pedido.id ? 'Atualizando...' : LABEL_ACAO[proximo] || STATUS_LABELS[proximo]}
        </button>
      )}
    </div>
  )
}

type TabDia = 'hoje' | '1dia' | '2dias'

function SecaoComAbas({ status, lista, tabAtiva, onTab, cardProps }: {
  status: string
  lista: any[]
  tabAtiva: TabDia
  onTab: (t: TabDia) => void
  cardProps: any
}) {
  const grupos = {
    hoje: lista.filter(p => diasDesde(p.created_at) === 0),
    '1dia': lista.filter(p => diasDesde(p.created_at) === 1),
    '2dias': lista.filter(p => diasDesde(p.created_at) >= 2),
  }

  const abas = [
    { key: 'hoje' as TabDia, label: 'Hoje', cor: 'text-green-700 bg-green-50 border-green-200', corAtiva: 'bg-green-600 text-white border-green-600', count: grupos.hoje.length },
    { key: '1dia' as TabDia, label: '1 dia', cor: 'text-yellow-700 bg-yellow-50 border-yellow-200', corAtiva: 'bg-yellow-500 text-white border-yellow-500', count: grupos['1dia'].length },
    { key: '2dias' as TabDia, label: '2+ dias', cor: 'text-red-700 bg-red-50 border-red-200', corAtiva: 'bg-red-500 text-white border-red-500', count: grupos['2dias'].length },
  ]

  const pedidosAba = grupos[tabAtiva]

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
        <span className="text-xs text-gray-400">{lista.length}</span>
      </div>

      <div className="flex gap-2 mb-3">
        {abas.map(aba => (
          <button
            key={aba.key}
            onClick={() => onTab(aba.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${tabAtiva === aba.key ? aba.corAtiva : aba.cor}`}
          >
            {aba.label}
            {aba.count > 0 && <span className="ml-1 opacity-75">({aba.count})</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {pedidosAba.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum pedido nessa faixa</p>
        ) : (
          pedidosAba.map((pedido: any) => (
            <PedidoCard key={pedido.id} pedido={pedido} {...cardProps} />
          ))
        )}
      </div>
    </div>
  )
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editandoObs, setEditandoObs] = useState<string | null>(null)
  const [obsTemp, setObsTemp] = useState('')
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [tabAguardando, setTabAguardando] = useState<TabDia>('hoje')
  const [tabProducao, setTabProducao] = useState<TabDia>('hoje')

  async function carregar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
    const { data } = await supabase
      .from('pedidos')
      .select('*, clientes(nome, whatsapp)')
      .eq('empresa_id', usuario!.empresa_id)
      .not('status', 'eq', 'cancelado')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function avancarStatus(pedido: any) {
    const temTransp = !!pedido.transportadora
    const proximo = proximoStatus(pedido.status, temTransp)
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

  const pedidosPorStatus = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = pedidos.filter(p => p.status === status)
    return acc
  }, {} as Record<string, any[]>)

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
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between pt-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <Link
          href="/pedidos/novo"
          className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} /> Novo
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum pedido ainda</p>
          <Link href="/pedidos/novo" className="inline-block mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium">
            Criar pedido
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {STATUS_ORDER.map(status => {
            const lista = pedidosPorStatus[status] || []
            if (lista.length === 0) return null

            if (status === 'aguardando_fotos') {
              return (
                <SecaoComAbas
                  key={status}
                  status={status}
                  lista={lista}
                  tabAtiva={tabAguardando}
                  onTab={setTabAguardando}
                  cardProps={cardProps}
                />
              )
            }

            if (status === 'producao') {
              return (
                <SecaoComAbas
                  key={status}
                  status={status}
                  lista={lista}
                  tabAtiva={tabProducao}
                  onTab={setTabProducao}
                  cardProps={cardProps}
                />
              )
            }

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[status] || status}
                  </span>
                  <span className="text-xs text-gray-400">{lista.length}</span>
                </div>
                <div className="space-y-2">
                  {lista.map((pedido: any) => (
                    <PedidoCard key={pedido.id} pedido={pedido} {...cardProps} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
