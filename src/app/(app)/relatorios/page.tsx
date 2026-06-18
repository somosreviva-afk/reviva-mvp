'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, BarChart2, TrendingUp, Package } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/formatters'

type Periodo = 'hoje' | 'semana' | 'mes' | 'ano'

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
]

function getDataInicio(periodo: Periodo): string {
  const hoje = new Date()
  switch (periodo) {
    case 'hoje':
      return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    case 'semana': {
      const d = new Date(hoje)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      d.setDate(diff)
      d.setHours(0, 0, 0, 0)
      return d.toISOString()
    }
    case 'ano':
      return new Date(hoje.getFullYear(), 0, 1).toISOString()
    default:
      return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
  }
}

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregarDados() }, [periodo])

  async function carregarDados() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
    const empresaId = usuario!.empresa_id
    const dataInicio = getDataInicio(periodo)

    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id, valor_total, valor_recebido, custo_total_pedido, lucro_real, qtd_imas, forma_pagamento')
      .eq('empresa_id', empresaId)
      .neq('status', 'cancelado')
      .gte('created_at', dataInicio)

    if (!pedidos || pedidos.length === 0) {
      setDados({ empty: true })
      setLoading(false)
      return
    }

    const pedidoIds = pedidos.map(p => p.id)
    const { data: itens } = await supabase
      .from('itens_pedido')
      .select('pedido_id, nome_produto, quantidade, subtotal')
      .in('pedido_id', pedidoIds)

    // Agrupa por produto
    const porProduto: Record<string, { qtd: number; faturamento: number; lucro: number }> = {}
    const lucroMap: Record<string, number> = {}
    const valorMap: Record<string, number> = {}
    pedidos.forEach(p => {
      lucroMap[p.id] = Number(p.lucro_real || 0)
      valorMap[p.id] = Number(p.valor_total || 0)
    })

    ;(itens || []).forEach(item => {
      const nome = item.nome_produto || 'Outros'
      if (!porProduto[nome]) porProduto[nome] = { qtd: 0, faturamento: 0, lucro: 0 }
      const subtotal = Number(item.subtotal || 0)
      const valorPedido = valorMap[item.pedido_id] || 0
      const proporcao = valorPedido > 0 ? subtotal / valorPedido : 0
      porProduto[nome].qtd += Number(item.quantidade || 0)
      porProduto[nome].faturamento += subtotal
      porProduto[nome].lucro += lucroMap[item.pedido_id] * proporcao
    })

    const faturamentoBruto = pedidos.reduce((s, p) => s + Number(p.valor_total || 0), 0)
    const valorRecebido = pedidos.reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
    const custosTotais = pedidos.reduce((s, p) => s + Number(p.custo_total_pedido || 0), 0)
    const lucroReal = pedidos.reduce((s, p) => s + Number(p.lucro_real || 0), 0)
    const totalImas = pedidos.reduce((s, p) => s + Number(p.qtd_imas || 0), 0)
    const valorMedio = faturamentoBruto / pedidos.length

    // Pix vs Link
    const totalPix = pedidos
      .filter(p => p.forma_pagamento === 'pix')
      .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)
    const totalLink = pedidos
      .filter(p => p.forma_pagamento !== 'pix')
      .reduce((s, p) => s + Number(p.valor_recebido || p.valor_total || 0), 0)

    const kitsOrdenados = Object.entries(porProduto).sort((a, b) => b[1].qtd - a[1].qtd)
    const kitMaisVendido = kitsOrdenados[0]
    const kitMaisLucrativo = Object.entries(porProduto).sort((a, b) => b[1].lucro - a[1].lucro)[0]

    setDados({
      empty: false,
      qtdPedidos: pedidos.length,
      totalImas,
      valorMedio,
      faturamentoBruto,
      valorRecebido,
      custosTotais,
      lucroReal,
      totalPix,
      totalLink,
      kitMaisVendido: kitMaisVendido ? { nome: kitMaisVendido[0], qtd: kitMaisVendido[1].qtd } : null,
      kitMaisLucrativo: kitMaisLucrativo ? { nome: kitMaisLucrativo[0], lucro: kitMaisLucrativo[1].lucro } : null,
      porProduto: Object.entries(porProduto).sort((a, b) => b[1].faturamento - a[1].faturamento),
    })
    setLoading(false)
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-5">
        <Link href="/financeiro" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-xs text-gray-400">Indicadores do negócio</p>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="flex gap-1.5 mb-5 bg-gray-100 p-1 rounded-xl">
        {PERIODOS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriodo(p.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              periodo === p.key ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : dados?.empty ? (
        <div className="text-center py-16">
          <BarChart2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum pedido neste período</p>
        </div>
      ) : (
        <>
          {/* Lucro Real — destaque */}
          <div className={`rounded-2xl p-5 mb-4 text-white ${dados.lucroReal >= 0 ? 'bg-green-600' : 'bg-red-500'}`}>
            <p className="text-sm text-green-200 mb-1">💖 Lucro Real</p>
            <p className="text-3xl font-bold">{formatCurrency(dados.lucroReal)}</p>
            <p className="text-xs text-green-200 mt-1">valor recebido − custos totais</p>
          </div>

          {/* KPIs Financeiros */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-500 mb-1">💰 Faturamento</p>
              <p className="text-sm font-bold text-blue-700">{formatCurrency(dados.faturamentoBruto)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-500 mb-1">💳 Recebido</p>
              <p className="text-sm font-bold text-green-700">{formatCurrency(dados.valorRecebido)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] text-gray-500 mb-1">📦 Custos</p>
              <p className="text-sm font-bold text-orange-600">{formatCurrency(dados.custosTotais)}</p>
            </div>
          </div>

          {/* Entradas por forma */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">💳 Entradas</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">💚 Pix recebido</p>
              <p className="text-base font-bold text-green-700">{formatCurrency(dados.totalPix)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">🔗 Link recebido</p>
              <p className="text-base font-bold text-purple-700">{formatCurrency(dados.totalLink)}</p>
            </div>
          </div>

          {/* Relatório de Vendas */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📊 Vendas</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pedidos no período</span>
              <span className="font-semibold text-gray-900">{dados.qtdPedidos}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ímãs vendidos</span>
              <span className="font-semibold text-gray-900">{dados.totalImas} un.</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Ticket médio</span>
              <span className="font-semibold text-gray-900">{formatCurrency(dados.valorMedio)}</span>
            </div>
            {dados.kitMaisVendido && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Kit mais vendido</span>
                <span className="font-semibold text-gray-900">
                  {dados.kitMaisVendido.nome} ({dados.kitMaisVendido.qtd}x)
                </span>
              </div>
            )}
            {dados.kitMaisLucrativo && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mais lucrativo</span>
                <span className="font-semibold text-green-700">
                  {dados.kitMaisLucrativo.nome} ({formatCurrency(dados.kitMaisLucrativo.lucro)})
                </span>
              </div>
            )}
          </div>

          {/* Relatório por Produto */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">📦 Por Produto</p>
          <div className="space-y-3 pb-8">
            {dados.porProduto.map(([nome, info]: [string, any]) => (
              <div key={nome} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">{nome}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 mb-0.5">Vendidos</p>
                    <p className="text-sm font-bold text-gray-800">{info.qtd}x</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 mb-0.5">Faturamento</p>
                    <p className="text-xs font-bold text-blue-700">{formatCurrency(info.faturamento)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-gray-500 mb-0.5">Lucro est.</p>
                    <p className="text-xs font-bold text-green-700">{formatCurrency(info.lucro)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
