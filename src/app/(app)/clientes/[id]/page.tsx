'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import {
  ArrowLeft, Phone, Mail, MapPin, Package,
  Gift, Edit2, Copy, MessageCircle, Plus, ChevronRight, Check,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const STATUS_LABEL: Record<string, string> = {
  aguardando_fotos: 'Aguard. fotos',
  orcamento:   'Orcamento',
  aprovado:    'Aprovado',
  producao:    'Producao',
  enviado:     'Enviado',
  finalizado:  'Finalizado',
  entregue:    'Entregue',
  cancelado:   'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  aguardando_fotos: 'bg-yellow-100 text-yellow-700',
  orcamento:   'bg-orange-100 text-orange-700',
  aprovado:    'bg-blue-100 text-blue-700',
  producao:    'bg-purple-100 text-purple-700',
  enviado:     'bg-teal-100 text-teal-700',
  finalizado:  'bg-green-100 text-green-700',
  entregue:    'bg-green-200 text-green-800',
  cancelado:   'bg-red-100 text-red-700',
}

function diasAtras(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}
function mesAno(dateStr: string): string {
  return new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00')
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
function fmtTimeline(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>()
  const [cliente, setCliente] = useState<any>(null)
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user!.id).single()

      const [{ data: cli }, { data: peds }] = await Promise.all([
        supabase.from('clientes')
          .select('*')
          .eq('id', id)
          .eq('empresa_id', usuario!.empresa_id)
          .single(),
        supabase.from('pedidos')
          .select('id, numero, created_at, status, valor_total, tipo, forma_pagamento, qtd_imas')
          .eq('cliente_id', id)
          .order('created_at', { ascending: false }),
      ])

      setCliente(cli)
      setPedidos(peds || [])
      setLoading(false)
    }
    carregar()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!cliente) return (
    <div className="p-4 text-center pt-16 text-gray-400">Cliente nao encontrado.</div>
  )

  const pedidosVenda   = pedidos.filter(p => p.tipo !== 'mimo' && p.status !== 'cancelado')
  const pedidosMimo    = pedidos.filter(p => p.tipo === 'mimo')
  const totalGasto     = pedidosVenda.reduce((s, p) => s + Number(p.valor_total ?? 0), 0)
  const ticketMedio    = pedidosVenda.length > 0 ? totalGasto / pedidosVenda.length : 0
  const totalImas      = pedidosVenda.reduce((s, p) => s + Number(p.qtd_imas ?? 0), 0)
  const primeiroPedido = pedidosVenda.length > 0 ? pedidosVenda[pedidosVenda.length - 1]?.created_at : null
  const ultimoPedido   = pedidosVenda.length > 0 ? pedidosVenda[0]?.created_at : null
  const ativo          = ultimoPedido ? diasAtras(ultimoPedido) <= 90 : false
  const local          = [cliente.cidade, cliente.estado].filter(Boolean).join(' / ')

  async function copiarDados() {
    const linhas = [
      cliente.nome,
      cliente.whatsapp  && `WhatsApp: ${cliente.whatsapp}`,
      cliente.email     && `E-mail: ${cliente.email}`,
      local             && `Local: ${local}`,
      cliente.endereco  && `Endereco: ${cliente.endereco}`,
    ].filter(Boolean).join('\n')
    try { await navigator.clipboard.writeText(linhas) } catch { alert(linhas) }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const timeline = [
    ...pedidos.map(p => ({
      key:   `p-${p.id}`,
      data:  p.created_at,
      tipo:  p.status === 'cancelado' ? 'cancelado' : 'pedido',
      texto: p.numero ? `Pedido #${p.numero}` : 'Pedido criado',
      sub:   p.status === 'cancelado'
        ? 'Cancelado'
        : p.tipo === 'mimo'
          ? 'Mimo'
          : `${STATUS_LABEL[p.status] || p.status} - ${formatCurrency(Number(p.valor_total ?? 0))}`,
      link: `/pedidos/${p.id}` as string | null,
    })),
    {
      key:   'cadastro',
      data:  cliente.created_at,
      tipo:  'cadastro',
      texto: 'Cliente cadastrado',
      sub:   null as string | null,
      link:  null as string | null,
    },
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  const diasUltimo = ultimoPedido ? diasAtras(ultimoPedido) : 0

  return (
    <div className="p-4 pb-28">

      {/* HEADER */}
      <div className="flex items-center gap-3 pt-4 mb-4">
        <Link href="/clientes" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 truncate">{cliente.nome}</h1>
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ativo ? 'bg-green-500' : 'bg-yellow-400'}`} />
          </div>
          <p className="text-xs text-gray-400">{ativo ? 'Cliente ativo' : 'Cliente inativo'}</p>
        </div>
        <Link href={`/clientes/${id}/editar`}
          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all flex items-center gap-1">
          <Edit2 size={14} /> Editar
        </Link>
      </div>

      {/* RESUMO DO CLIENTE */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-4 mb-4 text-white shadow-sm shadow-green-200">
        <p className="text-green-200 text-[10px] font-bold uppercase tracking-widest mb-2.5">Resumo do Cliente</p>
        <div className="space-y-1.5">
          <p className="text-sm text-white">Cliente desde <strong>{mesAno(cliente.created_at)}</strong></p>
          {pedidosVenda.length > 0 ? (
            <p className="text-sm text-white"><strong>{pedidosVenda.length}</strong> pedido{pedidosVenda.length > 1 ? 's' : ''} realizados</p>
          ) : (
            <p className="text-sm text-green-200">Nenhum pedido ainda</p>
          )}
          {ticketMedio > 0 && (
            <p className="text-sm text-white">Ticket medio <strong>{formatCurrency(ticketMedio)}</strong></p>
          )}
          {ultimoPedido && (
            <p className="text-sm text-white">Ultima compra ha <strong>{diasUltimo} dia{diasUltimo > 1 ? 's' : ''}</strong></p>
          )}
          {totalGasto > 0 && (
            <p className="text-sm text-white">Total gasto <strong>{formatCurrency(totalGasto)}</strong></p>
          )}
          {pedidosMimo.length > 0 && (
            <p className="text-sm text-green-200">{pedidosMimo.length} mimo{pedidosMimo.length > 1 ? 's' : ''} recebido{pedidosMimo.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* ACOES RAPIDAS */}
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Acoes Rapidas</p>
        <div className="grid grid-cols-4 gap-2">
          <Link href={`/pedidos/novo?cliente=${cliente.id}`}
            className="flex flex-col items-center gap-1.5 bg-green-50 border border-green-200 rounded-2xl py-3 text-center active:scale-95 transition-all">
            <Plus size={20} className="text-green-600" />
            <span className="text-[10px] font-bold text-green-700">Novo Pedido</span>
          </Link>

          {cliente.whatsapp ? (
            <a href={`https://wa.me/55${cliente.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-1.5 bg-green-50 border border-green-200 rounded-2xl py-3 text-center active:scale-95 transition-all">
              <MessageCircle size={20} className="text-green-600" />
              <span className="text-[10px] font-bold text-green-700">WhatsApp</span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-2xl py-3 text-center opacity-40">
              <MessageCircle size={20} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400">WhatsApp</span>
            </div>
          )}

          <button onClick={copiarDados}
            className={`flex flex-col items-center gap-1.5 border rounded-2xl py-3 text-center active:scale-95 transition-all ${
              copiado ? 'bg-blue-100 border-blue-300' : 'bg-blue-50 border-blue-200'
            }`}>
            {copiado ? <Check size={20} className="text-blue-700" /> : <Copy size={20} className="text-blue-600" />}
            <span className="text-[10px] font-bold text-blue-700">{copiado ? 'Copiado!' : 'Copiar'}</span>
          </button>

          <Link href={`/clientes/${id}/editar`}
            className="flex flex-col items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-2xl py-3 text-center active:scale-95 transition-all">
            <Edit2 size={20} className="text-gray-600" />
            <span className="text-[10px] font-bold text-gray-600">Editar</span>
          </Link>
        </div>
      </div>

      {/* INFORMACOES */}
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Informacoes</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {cliente.whatsapp && (
            <a href={`https://wa.me/55${cliente.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3 active:bg-gray-50">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                <Phone size={14} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400">WhatsApp</p>
                <p className="text-sm font-medium text-gray-900">{cliente.whatsapp}</p>
              </div>
              <span className="text-xs text-green-600 font-semibold">Abrir</span>
            </a>
          )}
          {cliente.email && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <Mail size={14} className="text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400">E-mail</p>
                <p className="text-sm font-medium text-gray-900">{cliente.email}</p>
              </div>
            </div>
          )}
          {local && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                <MapPin size={14} className="text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400">Cidade / Estado</p>
                <p className="text-sm font-medium text-gray-900">{local}</p>
              </div>
            </div>
          )}
          {cliente.endereco && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                <MapPin size={14} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400">Endereco</p>
                <p className="text-sm text-gray-700">{cliente.endereco}</p>
              </div>
            </div>
          )}
          {!cliente.whatsapp && !cliente.email && !local && !cliente.endereco && (
            <div className="px-4 py-4 text-center">
              <p className="text-xs text-gray-400">Nenhum contato cadastrado</p>
              <Link href={`/clientes/${id}/editar`} className="text-xs text-green-600 font-semibold mt-1 block">
                Adicionar informacoes
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ESTATISTICAS */}
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Estatisticas</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-bold text-gray-900">{pedidosVenda.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total de pedidos</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalGasto)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total gasto</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xl font-bold text-blue-700">{formatCurrency(ticketMedio)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Ticket medio</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-2xl font-bold text-purple-700">{totalImas}</p>
            <p className="text-xs text-gray-400 mt-0.5">Imas recebidos</p>
          </div>
          {primeiroPedido && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-bold text-gray-900">{formatDate(primeiroPedido)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Primeiro pedido</p>
            </div>
          )}
          {ultimoPedido && (
            <div className={`rounded-2xl border shadow-sm p-4 ${ativo ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className="text-sm font-bold text-gray-900">{formatDate(ultimoPedido)}</p>
              <p className={`text-xs mt-0.5 ${ativo ? 'text-green-600' : 'text-yellow-600'}`}>Ultimo pedido</p>
            </div>
          )}
          {pedidosMimo.length > 0 && (
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
              <p className="text-2xl font-bold text-pink-600">{pedidosMimo.length}</p>
              <p className="text-xs text-pink-400 mt-0.5">Mimos recebidos</p>
            </div>
          )}
        </div>
      </div>

      {/* OBSERVACOES */}
      {cliente.observacoes ? (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Observacoes internas</p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-gray-800 leading-relaxed">{cliente.observacoes}</p>
            <Link href={`/clientes/${id}/editar`}
              className="text-xs text-amber-700 font-semibold mt-2 inline-block">
              Editar
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Observacoes internas</p>
          <Link href={`/clientes/${id}/editar`}
            className="block bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 text-center text-xs text-gray-400">
            + Adicionar observacao interna
          </Link>
        </div>
      )}

      {/* HISTORICO DE PEDIDOS */}
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Historico de Pedidos</p>
        {pedidos.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <Package size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">Nenhum pedido ainda</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {pedidos.map(pedido => (
              <Link key={pedido.id} href={`/pedidos/${pedido.id}`}
                className="flex items-center justify-between px-4 py-3 active:bg-gray-50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      STATUS_COLOR[pedido.status] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {STATUS_LABEL[pedido.status] || pedido.status}
                    </span>
                    {pedido.tipo === 'mimo' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 flex-shrink-0">Mimo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {pedido.numero ? `#${pedido.numero} - ` : ''}{formatDate(pedido.created_at)}
                    {pedido.qtd_imas > 0 ? ` - ${pedido.qtd_imas} imas` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pedido.tipo === 'mimo' ? (
                    <Gift size={14} className="text-pink-400" />
                  ) : (
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(Number(pedido.valor_total ?? 0))}
                    </p>
                  )}
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* LINHA DO TEMPO */}
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 px-1">Linha do Tempo</p>
        <div className="relative pl-4">
          <div className="absolute left-[1.375rem] top-3 bottom-3 w-0.5 bg-gray-100" />
          <div className="space-y-3">
            {timeline.map(ev => {
              const dotColor =
                ev.tipo === 'cadastro'  ? 'bg-blue-400'  :
                ev.tipo === 'cancelado' ? 'bg-red-400'   : 'bg-green-500'
              const ringColor =
                ev.tipo === 'cadastro'  ? 'bg-blue-50'   :
                ev.tipo === 'cancelado' ? 'bg-red-50'    : 'bg-green-50'
              const borderColor =
                ev.tipo === 'cadastro'  ? 'border-blue-100'  :
                ev.tipo === 'cancelado' ? 'border-red-100'   : 'border-gray-100'
              const boxColor =
                ev.tipo === 'cadastro'  ? 'bg-blue-50'   :
                ev.tipo === 'cancelado' ? 'bg-red-50'    : 'bg-white'

              const inner = (
                <div className={`flex-1 ${boxColor} border ${borderColor} rounded-xl p-3`}>
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{ev.texto}</p>
                  {ev.sub && <p className="text-xs text-gray-500 mt-0.5">{ev.sub}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{fmtTimeline(ev.data)}</p>
                </div>
              )

              return (
                <div key={ev.key} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-2.5 z-10 ${ringColor}`}>
                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                  </div>
                  {ev.link ? (
                    <Link href={ev.link} className="flex-1 active:opacity-80">{inner}</Link>
                  ) : (
                    inner
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA */}
      <Link href={`/pedidos/novo?cliente=${cliente.id}`}
        className="block w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-center text-base active:scale-95 transition-all shadow-sm shadow-green-200">
        + Novo Pedido para {cliente.nome.split(' ')[0]}
      </Link>
    </div>
  )
}
