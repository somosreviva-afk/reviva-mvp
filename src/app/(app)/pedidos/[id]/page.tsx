'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, MessageCircle, ChevronRight, Truck } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER } from '@/lib/utils/formatters'

export default function PedidoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [pedido, setPedido] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [rastreio, setRastreio] = useState('')
  const [salvandoRastreio, setSalvandoRastreio] = useState(false)

  async function carregar() {
    const supabase = createClient()
    const { data: p } = await supabase
      .from('pedidos')
      .select('*, clientes(*)')
      .eq('id', id)
      .single()
    const { data: i } = await supabase
      .from('itens_pedido')
      .select('*')
      .eq('pedido_id', id)
      .order('created_at')
    setPedido(p)
    setItens(i || [])
    setRastreio(p?.codigo_rastreio || '')
    setLoading(false)
  }

  useEffect(() => { carregar() }, [id])

  async function mudarStatus(novoStatus: string) {
    setAtualizando(true)
    const supabase = createClient()
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id)
    await carregar()
    setAtualizando(false)
  }

  async function salvarRastreio() {
    setSalvandoRastreio(true)
    const supabase = createClient()
    await supabase.from('pedidos').update({ codigo_rastreio: rastreio || null }).eq('id', id)
    setSalvandoRastreio(false)
    alert('Rastreio salvo!')
  }

  async function cancelar() {
    if (!confirm('Cancelar este pedido?')) return
    await mudarStatus('cancelado')
  }

  function abrirWhatsApp() {
    if (!pedido?.clientes?.whatsapp) return
    const numero = pedido.clientes.whatsapp.replace(/\D/g, '')
    const dataEntrega = pedido.data_entrega ? `\nEntrega: ${formatDate(pedido.data_entrega)}` : ''
    const listaItens = itens.map(i => `• ${i.nome_produto} x${i.quantidade} — ${formatCurrency(i.subtotal)}`).join('\n')
    const mensagem = `Olá ${pedido.clientes.nome}! 👋\n\nSeu pedido #${pedido.numero}:\n${listaItens}${dataEntrega}\n\n*Total: ${formatCurrency(pedido.valor_total)}*\n\nStatus: ${STATUS_LABELS[pedido.status]}`
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!pedido) return (
    <div className="p-4 text-center py-16">
      <p className="text-gray-500">Pedido não encontrado</p>
      <Link href="/pedidos" className="text-green-600 underline mt-2 block">Voltar</Link>
    </div>
  )

  const proximosStatus = STATUS_ORDER[pedido.status] || []

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/pedidos" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pedido #{pedido.numero}</h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[pedido.status]}`}>
            {STATUS_LABELS[pedido.status]}
          </span>
        </div>
      </div>

      {/* Cliente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cliente</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-700 font-bold text-sm">
                {pedido.clientes?.nome?.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{pedido.clientes?.nome}</p>
              {pedido.clientes?.whatsapp && (
                <p className="text-sm text-gray-500">{pedido.clientes.whatsapp}</p>
              )}
            </div>
          </div>
          {pedido.clientes?.whatsapp && (
            <button
              onClick={abrirWhatsApp}
              className="flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-2 rounded-xl text-sm font-medium"
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Produtos</p>
        <div className="space-y-3">
          {itens.map(item => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.nome_produto}</p>
                <p className="text-xs text-gray-400">
                  {item.quantidade}x {formatCurrency(item.preco_unitario)}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100">
          {pedido.desconto > 0 && (
            <>
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Subtotal</span>
                <span>{formatCurrency(pedido.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Desconto</span>
                <span>- {formatCurrency(pedido.desconto)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span className="text-lg">{formatCurrency(pedido.valor_total)}</span>
          </div>
        </div>
      </div>

      {/* Frete */}
      {(pedido.transportadora || pedido.frete_valor > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={15} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Frete</p>
          </div>
          <div className="space-y-2">
            {pedido.transportadora && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transportadora</span>
                <span className="font-medium text-gray-900">{pedido.transportadora}</span>
              </div>
            )}
            {pedido.frete_valor > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor</span>
                <span className="font-medium text-gray-900">{formatCurrency(pedido.frete_valor)}</span>
              </div>
            )}
            {pedido.prazo_entrega && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prazo</span>
                <span className="font-medium text-gray-900">{pedido.prazo_entrega}</span>
              </div>
            )}
          </div>

          {/* Rastreio */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Código de rastreio</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={rastreio}
                onChange={e => setRastreio(e.target.value)}
                placeholder="Ex: BR123456789BR"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={salvarRastreio}
                disabled={salvandoRastreio}
                className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {salvandoRastreio ? '...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detalhes */}
      {(pedido.data_entrega || pedido.observacoes) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
          {pedido.data_entrega && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Data de entrega</p>
              <p className="text-sm text-gray-900 font-medium">{formatDate(pedido.data_entrega)}</p>
            </div>
          )}
          {pedido.observacoes && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Observações</p>
              <p className="text-sm text-gray-700">{pedido.observacoes}</p>
            </div>
          )}
        </div>
      )}

      {/* Ações de status */}
      {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Mover para</p>
          <div className="space-y-2">
            {proximosStatus.filter(s => s !== 'cancelado').map(s => (
              <button
                key={s}
                onClick={() => mudarStatus(s)}
                disabled={atualizando}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[s]}`}>
                  {STATUS_LABELS[s]}
                </span>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cancelar */}
      {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
        <div className="pb-24">
          <button
            onClick={cancelar}
            className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium"
          >
            Cancelar pedido
          </button>
        </div>
      )}
    </div>
  )
}
