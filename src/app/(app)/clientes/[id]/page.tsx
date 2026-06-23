import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { ArrowLeft, Phone, MapPin, Package, ShoppingBag, Gift } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const STATUS_LABEL: Record<string, string> = {
  aguardando_fotos: 'Aguard. fotos',
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  producao: 'Produção',
  enviado: 'Enviado',
  finalizado: 'Finalizado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  aguardando_fotos: 'bg-yellow-100 text-yellow-700',
  orcamento: 'bg-blue-100 text-blue-700',
  aprovado: 'bg-indigo-100 text-indigo-700',
  producao: 'bg-purple-100 text-purple-700',
  enviado: 'bg-teal-100 text-teal-700',
  finalizado: 'bg-green-100 text-green-700',
  entregue: 'bg-green-200 text-green-800',
  cancelado: 'bg-red-100 text-red-700',
}

export default async function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios').select('empresa_id').eq('id', user!.id).single()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .eq('empresa_id', usuario!.empresa_id)
    .single()

  if (!cliente) notFound()

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, created_at, status, valor_total, tipo, forma_pagamento, qtd_imas')
    .eq('cliente_id', id)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })

  const lista = pedidos || []
  const totalGasto = lista
    .filter(p => p.tipo !== 'mimo')
    .reduce((s, p) => s + Number(p.valor_total || 0), 0)
  const totalImas = lista.reduce((s, p) => s + Number(p.qtd_imas || 0), 0)
  const pedidosMimo = lista.filter(p => p.tipo === 'mimo').length
  const pedidosVenda = lista.filter(p => p.tipo !== 'mimo').length

  return (
    <div className="p-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4 mb-5">
        <Link href="/clientes" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{cliente.nome}</h1>
          <p className="text-xs text-gray-400">Perfil do cliente</p>
        </div>
        <Link
          href={`/pedidos/novo?cliente=${cliente.id}`}
          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
        >
          + Pedido
        </Link>
      </div>

      {/* Contato */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        {cliente.whatsapp && (
          <a
            href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 py-2"
          >
            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
              <Phone size={14} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">WhatsApp</p>
              <p className="text-sm font-semibold text-gray-900">{cliente.whatsapp}</p>
            </div>
            <span className="ml-auto text-xs text-green-600 font-semibold">Abrir →</span>
          </a>
        )}
        {cliente.endereco && (
          <div className="flex items-center gap-3 py-2 border-t border-gray-100">
            <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center">
              <MapPin size={14} className="text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Endereço</p>
              <p className="text-sm text-gray-700">{cliente.endereco}</p>
            </div>
          </div>
        )}
        {cliente.observacoes && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Observações</p>
            <p className="text-sm text-gray-600">{cliente.observacoes}</p>
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <ShoppingBag size={13} className="text-blue-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{pedidosVenda}</p>
          <p className="text-[10px] text-gray-400">pedidos</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <Package size={13} className="text-green-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{totalImas}</p>
          <p className="text-[10px] text-gray-400">ímãs</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
          <div className="w-7 h-7 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-1">
            <Gift size={13} className="text-pink-600" />
          </div>
          <p className="text-lg font-bold text-gray-900">{pedidosMimo}</p>
          <p className="text-[10px] text-gray-400">mimos</p>
        </div>
      </div>

      {/* Total gasto */}
      {totalGasto > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5">
          <p className="text-xs text-green-600 mb-1">Total investido pela cliente</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalGasto)}</p>
        </div>
      )}

      {/* Histórico de pedidos */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Histórico de Pedidos</p>
      {lista.length === 0 ? (
        <div className="text-center py-10">
          <Package size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400 text-sm">Nenhum pedido ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map(pedido => (
            <Link
              key={pedido.id}
              href={`/pedidos/${pedido.id}`}
              className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    STATUS_COLOR[pedido.status] || 'bg-gray-100 text-gray-600'
                  }`}>
                    {STATUS_LABEL[pedido.status] || pedido.status}
                  </span>
                  {pedido.tipo === 'mimo' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-600">
                      Mimo
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{formatDate(pedido.created_at)}</p>
                {pedido.qtd_imas > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">{pedido.qtd_imas} ímãs</p>
                )}
              </div>
              <div className="text-right">
                {pedido.tipo === 'mimo' ? (
                  <p className="text-sm font-bold text-pink-500">Mimo</p>
                ) : (
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(pedido.valor_total)}</p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">ver →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
