'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils/formatters'
import { Plus, ShoppingBag, ChevronRight, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'

const STATUS_ORDER = ['aguardando_fotos', 'producao', 'enviado', 'entregue', 'orcamento', 'finalizado']

// Próximo status baseado no status atual e se tem transportadora
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

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editandoObs, setEditandoObs] = useState<string | null>(null)
  const [obsTemp, setObsTemp] = useState('')
  const [atualizando, setAtualizando] = useState<string | null>(null)

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
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[status] || status}
                  </span>
                  <span className="text-xs text-gray-400">{lista.length}</span>
                </div>
                <div className="space-y-2">
                  {lista.map((pedido: any) => {
                    const temTransp = !!pedido.transportadora
                    const proximo = proximoStatus(pedido.status, temTransp)
                    const isEntregue = pedido.status === 'entregue'
                    return (
                      <div key={pedido.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Linha principal → abre pedido */}
                        <Link href={`/pedidos/${pedido.id}`} className="flex items-center justify-between p-4">
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
                              {pedido.tipo === 'mimo' ? (
                                <span className="text-pink-500 text-sm">Mimo</span>
                              ) : formatCurrency(pedido.valor_total)}
                            </p>
                            <ChevronRight size={16} className="text-gray-300" />
                          </div>
                        </Link>

                        {/* Observação inline */}
                        <div className="px-4 pb-2">
                          {editandoObs === pedido.id ? (
                            <div className="flex items-start gap-2" onClick={e => e.stopPropagation()}>
                              <textarea
                                value={obsTemp}
                                onChange={e => setObsTemp(e.target.value)}
                                autoFocus
                                rows={2}
                                placeholder="Observação..."
                                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                              <div className="flex flex-col gap-1">
                                <button onClick={() => salvarObs(pedido.id)}
                                  className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
                                  <Check size={13} className="text-white" />
                                </button>
                                <button onClick={() => setEditandoObs(null)}
                                  className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <X size={13} className="text-gray-500" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={e => iniciarEditObs(pedido, e)}
                              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1"
                            >
                              <Pencil size={11} />
                              <span className="truncate max-w-xs">
                                {pedido.observacoes || 'Adicionar observacao...'}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Botoes de acao rapida */}
                        {!isEntregue && (
                          <div className="flex border-t border-gray-100">
                            {pedido.status !== 'producao' && pedido.status !== 'enviado' && (
                              <button
                                disabled={atualizando === pedido.id}
                                className="flex-1 py-2.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-all rounded-bl-2xl"
                                onClick={async (e) => {
                                  e.preventDefault()
                                  setAtualizando(pedido.id)
                                  const supabase = createClient()
                                  await supabase.from('pedidos').update({ status: 'producao' }).eq('id', pedido.id)
                                  await carregar()
                                  setAtualizando(null)
                                }}
                              >
                                {atualizando === pedido.id ? '...' : 'Em Preparacao'}
                              </button>
                            )}
                            <button
                              disabled={atualizando === pedido.id}
                              className={`flex-1 py-2.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-all ${
                                pedido.status !== 'producao' && pedido.status !== 'enviado' ? 'rounded-br-2xl' : 'rounded-b-2xl'
                              }`}
                              onClick={async (e) => {
                                e.preventDefault()
                                setAtualizando(pedido.id)
                                const supabase = createClient()
                                await supabase.from('pedidos').update({ status: 'entregue' }).eq('id', pedido.id)
                                await carregar()
                                setAtualizando(null)
                              }}
                            >
                              {atualizando === pedido.id ? '...' : 'Entregue'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
