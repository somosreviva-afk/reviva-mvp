'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/formatters'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'
import {
  TrendingUp, DollarSign, Package, Users, Lightbulb,
  Download, PartyPopper, ChevronRight, ArrowUpRight, ArrowDownRight,
  BarChart2,
} from 'lucide-react'

// ── TIPOS ──────────────────────────────────────────────────────────────────
type Aba = 'geral' | 'financeiro' | 'produtos' | 'clientes' | 'producao' | 'estoque' | 'eventos'
type Periodo = '1m' | '3m' | '6m' | '1a' | 'tudo'

const ABAS: { key: Aba; label: string; emoji: string }[] = [
  { key: 'geral',      label: 'Visao Geral', emoji: '📈' },
  { key: 'financeiro', label: 'Financeiro',  emoji: '💰' },
  { key: 'produtos',   label: 'Produtos',    emoji: '📦' },
  { key: 'clientes',   label: 'Clientes',    emoji: '👥' },
  { key: 'producao',   label: 'Producao',    emoji: '🏭' },
  { key: 'estoque',    label: 'Estoque',     emoji: '🗄️' },
  { key: 'eventos',    label: 'Eventos',     emoji: '🎉' },
]

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: '1m',   label: '1M' },
  { key: '3m',   label: '3M' },
  { key: '6m',   label: '6M' },
  { key: '1a',   label: '1A' },
  { key: 'tudo', label: 'Tudo' },
]

const CORES = ['#b5005e','#10b981','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#84cc16']

// ── HELPERS ────────────────────────────────────────────────────────────────
function getInicio(periodo: Periodo): Date {
  const now = new Date()
  if (periodo === '1m')  return new Date(now.getFullYear(), now.getMonth() - 1,  now.getDate())
  if (periodo === '3m')  return new Date(now.getFullYear(), now.getMonth() - 3,  now.getDate())
  if (periodo === '6m')  return new Date(now.getFullYear(), now.getMonth() - 6,  now.getDate())
  if (periodo === '1a')  return new Date(now.getFullYear() - 1, now.getMonth(),  now.getDate())
  return new Date(2020, 0, 1)
}

function getInicioAnt(periodo: Periodo): Date {
  const inicio = getInicio(periodo)
  const now    = new Date()
  const diffMs = now.getTime() - inicio.getTime()
  return new Date(inicio.getTime() - diffMs)
}

function fmtMesLabel(iso: string): string {
  const d = new Date(iso + '-01')
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function groupByMonth(items: any[], dateKey: string, valueKey: string | null, countOnly = false): { mes: string; valor: number }[] {
  const map: Record<string, number> = {}
  items.forEach(item => {
    const ds = item[dateKey] as string
    if (!ds) return
    const d   = new Date(ds)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = 0
    if (countOnly)       map[key]++
    else if (valueKey)   map[key] += Number(item[valueKey] || 0)
  })
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valor]) => ({ mes: fmtMesLabel(mes), valor }))
}

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / Math.abs(prev)) * 100)
}

// ── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [aba,     setAba]     = useState<Aba>('geral')
  const [periodo, setPeriodo] = useState<Periodo>('6m')
  const [loading, setLoading] = useState(true)

  // dados brutos
  const [pedidos,         setPedidos]         = useState<any[]>([])
  const [itens,           setItens]           = useState<any[]>([])
  const [clientes,        setClientes]        = useState<any[]>([])
  const [insumos,         setInsumos]         = useState<any[]>([])
  const [movEstoque,      setMovEstoque]      = useState<any[]>([])
  const [custosProducao,  setCustosProducao]  = useState<any[]>([])
  const [eventos,         setEventos]         = useState<any[]>([])

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario }  = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const eid = usuario!.empresa_id

      // fase 1 — dados independentes
      const [
        { data: peds },
        { data: cls },
        { data: ins },
        { data: movs },
        { data: custos },
        { data: evts },
      ] = await Promise.all([
        supabase.from('pedidos')
          .select('id,created_at,status,tipo,valor_total,valor_recebido,custo_total_pedido,lucro_real,qtd_imas,forma_pagamento,cliente_id')
          .eq('empresa_id', eid).neq('status', 'cancelado').order('created_at'),
        supabase.from('clientes')
          .select('id,nome,num_pedidos,total_gasto,created_at,tipo,cidade,estado,whatsapp')
          .eq('empresa_id', eid).order('total_gasto', { ascending: false }),
        supabase.from('insumos')
          .select('id,nome,quantidade,quantidade_minima,valor_unitario,unidade')
          .eq('empresa_id', eid),
        supabase.from('movimentacoes_estoque')
          .select('id,insumo_id,tipo,quantidade,data,valor_pago,insumos(nome)')
          .eq('empresa_id', eid).order('data'),
        supabase.from('custos_producao')
          .select('id,data,descricao,valor,pedido_id')
          .eq('empresa_id', eid).order('data'),
        supabase.from('eventos')
          .select('id,nome,data,status,valor_total')
          .eq('empresa_id', eid).order('data', { ascending: false }),
      ])

      setPedidos(peds || [])
      setClientes(cls || [])
      setInsumos(ins || [])
      setMovEstoque(movs || [])
      setCustosProducao(custos || [])
      setEventos(evts || [])

      // fase 2 — itens_pedido (precisa dos ids dos pedidos)
      const pedIds = (peds || []).map((p: any) => p.id)
      if (pedIds.length > 0) {
        const { data: its } = await supabase
          .from('itens_pedido')
          .select('pedido_id,nome_produto,quantidade,subtotal')
          .in('pedido_id', pedIds)
        setItens(its || [])
      }

      setLoading(false)
    }
    carregar()
  }, [])

  // ── DADOS FILTRADOS ──────────────────────────────────────────────────────
  const inicio    = useMemo(() => getInicio(periodo),    [periodo])
  const inicioAnt = useMemo(() => getInicioAnt(periodo), [periodo])

  const pedsFilt = useMemo(() =>
    pedidos.filter(p => p.tipo !== 'mimo' && new Date(p.created_at) >= inicio),
    [pedidos, inicio])

  const pedsAnt = useMemo(() =>
    pedidos.filter(p => p.tipo !== 'mimo' && new Date(p.created_at) >= inicioAnt && new Date(p.created_at) < inicio),
    [pedidos, inicio, inicioAnt])

  const custosFilt = useMemo(() =>
    custosProducao.filter(c => new Date(c.data + 'T00:00:00') >= inicio),
    [custosProducao, inicio])

  const eventosFilt = useMemo(() =>
    eventos.filter(e => new Date(e.data + 'T00:00:00') >= inicio),
    [eventos, inicio])

  // ── KPIs PERÍODO ATUAL ───────────────────────────────────────────────────
  const receita    = useMemo(() => pedsFilt.reduce((s, p) => s + Number(p.valor_total  || 0), 0), [pedsFilt])
  const lucro      = useMemo(() => pedsFilt.reduce((s, p) => s + Number(p.lucro_real   || 0), 0), [pedsFilt])
  const qtdPeds    = pedsFilt.length
  const ticketMed  = qtdPeds > 0 ? receita / qtdPeds : 0

  // ── KPIs PERÍODO ANTERIOR ────────────────────────────────────────────────
  const receitaAnt   = useMemo(() => pedsAnt.reduce((s, p) => s + Number(p.valor_total || 0), 0), [pedsAnt])
  const lucroAnt     = useMemo(() => pedsAnt.reduce((s, p) => s + Number(p.lucro_real  || 0), 0), [pedsAnt])
  const qtdPedsAnt   = pedsAnt.length
  const ticketAnt    = qtdPedsAnt > 0 ? receitaAnt / qtdPedsAnt : 0

  // ── CLIENTES ─────────────────────────────────────────────────────────────
  const hoje     = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const clientesNovos  = useMemo(() => clientes.filter(c => new Date(c.created_at) >= inicioMes).length, [clientes])
  const recorrentes    = useMemo(() => clientes.filter(c => Number(c.num_pedidos || 0) >= 2).length, [clientes])
  const rankingClients = useMemo(() => [...clientes].sort((a, b) => Number(b.total_gasto || 0) - Number(a.total_gasto || 0)).slice(0, 10), [clientes])

  // ── PRODUTOS ─────────────────────────────────────────────────────────────
  const porProduto = useMemo(() => {
    const pedSet   = new Set(pedsFilt.map(p => p.id))
    const valorMap: Record<string, number> = {}
    const lucroMap: Record<string, number> = {}
    pedsFilt.forEach(p => {
      valorMap[p.id] = Number(p.valor_total || 0)
      lucroMap[p.id] = Number(p.lucro_real  || 0)
    })
    const map: Record<string, { qtd: number; faturamento: number; lucro: number }> = {}
    itens.filter(i => pedSet.has(i.pedido_id)).forEach(item => {
      const nome = item.nome_produto || 'Outros'
      if (!map[nome]) map[nome] = { qtd: 0, faturamento: 0, lucro: 0 }
      const subtotal  = Number(item.subtotal    || 0)
      const valPed    = valorMap[item.pedido_id] || 0
      const prop      = valPed > 0 ? subtotal / valPed : 0
      map[nome].qtd         += Number(item.quantidade || 0)
      map[nome].faturamento += subtotal
      map[nome].lucro       += lucroMap[item.pedido_id] * prop
    })
    return Object.entries(map).sort((a, b) => b[1].faturamento - a[1].faturamento)
  }, [pedsFilt, itens])

  // ── CHARTS DATA ──────────────────────────────────────────────────────────
  const receitaPorMes  = useMemo(() => groupByMonth(pedidos.filter(p => p.tipo !== 'mimo'), 'created_at', 'valor_total'), [pedidos])
  const lucroPorMes    = useMemo(() => groupByMonth(pedidos.filter(p => p.tipo !== 'mimo'), 'created_at', 'lucro_real'),  [pedidos])
  const pedsPorMes     = useMemo(() => groupByMonth(pedidos.filter(p => p.tipo !== 'mimo'), 'created_at', null, true),    [pedidos])
  const clientesPorMes = useMemo(() => groupByMonth(clientes, 'created_at', null, true), [clientes])

  // ── FORMA DE PAGAMENTO ───────────────────────────────────────────────────
  const porFormaPag = useMemo(() => {
    const map: Record<string, number> = {}
    pedsFilt.forEach(p => {
      const f = p.forma_pagamento || 'outros'
      map[f] = (map[f] || 0) + Number(p.valor_total || 0)
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [pedsFilt])

  // ── ESTOQUE ──────────────────────────────────────────────────────────────
  const valorEstoque = useMemo(() =>
    insumos.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.valor_unitario || 0), 0),
    [insumos])

  const consumoPorMat = useMemo(() => {
    const map: Record<string, number> = {}
    movEstoque.filter(m => m.tipo === 'saida' || m.tipo === 'consumo').forEach(m => {
      const nome = (m.insumos as any)?.nome || 'Outros'
      map[nome] = (map[nome] || 0) + Number(m.quantidade || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [movEstoque])

  // ── PRODUÇÃO ─────────────────────────────────────────────────────────────
  const statusCount = useMemo(() => {
    const map: Record<string, number> = {}
    pedidos.forEach(p => { map[p.status] = (map[p.status] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [pedidos])

  const custoProdTotal = useMemo(() => custosFilt.reduce((s, c) => s + Number(c.valor || 0), 0), [custosFilt])
  const custoProdMedio = qtdPeds > 0 && custoProdTotal > 0 ? custoProdTotal / qtdPeds : 0

  // ── EVENTOS ──────────────────────────────────────────────────────────────
  const receitaEventos = useMemo(() => eventosFilt.reduce((s, e) => s + Number(e.valor_total || 0), 0), [eventosFilt])

  // ── INSIGHTS ─────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { emoji: string; texto: string; tipo: 'ok' | 'neutro' | 'alerta' }[] = []

    if (porProduto.length > 0) {
      const [nome, info] = porProduto[0]
      const totalQtd = porProduto.reduce((s, [, i]) => s + i.qtd, 0)
      const p = totalQtd > 0 ? Math.round((info.qtd / totalQtd) * 100) : 0
      list.push({ emoji: '📦', tipo: 'ok', texto: `${nome} representa ${p}% das vendas no periodo.` })
    }

    if (ticketAnt > 0 && ticketMed > 0) {
      const diff = pctChange(ticketMed, ticketAnt)
      if (diff > 0)  list.push({ emoji: '💰', tipo: 'ok',    texto: `Ticket medio aumentou ${diff}% em relacao ao periodo anterior.` })
      else if (diff < 0) list.push({ emoji: '⚠️', tipo: 'alerta', texto: `Ticket medio caiu ${Math.abs(diff)}% em relacao ao periodo anterior.` })
    }

    const pctRecorr = clientes.length > 0 ? Math.round((recorrentes / clientes.length) * 100) : 0
    if (pctRecorr > 0) list.push({ emoji: '👥', tipo: 'ok', texto: `${pctRecorr}% dos clientes ja realizaram mais de uma compra.` })

    if (lucroAnt > 0) {
      const diffL = pctChange(lucro, lucroAnt)
      if (diffL < -10) list.push({ emoji: '⚠️', tipo: 'alerta', texto: `Lucro esta ${Math.abs(diffL)}% abaixo do periodo anterior.` })
      else if (diffL > 10) list.push({ emoji: '📈', tipo: 'ok', texto: `Lucro cresceu ${diffL}% em relacao ao periodo anterior.` })
    }

    const criticos = insumos.filter(i => Number(i.quantidade || 0) < Number(i.quantidade_minima || 0))
    if (criticos.length > 0) list.push({ emoji: '🔴', tipo: 'alerta', texto: `${criticos.length} material(is) abaixo do estoque minimo.` })

    if (custoProdTotal > 0 && receita > 0) {
      const p = Math.round((custoProdTotal / receita) * 100)
      list.push({ emoji: '🏭', tipo: 'neutro', texto: `Custos de producao representam ${p}% da receita no periodo.` })
    }

    if (eventosFilt.length > 0) {
      list.push({ emoji: '🎉', tipo: 'neutro', texto: `${eventosFilt.length} evento(s) no periodo, gerando ${formatCurrency(receitaEventos)}.` })
    }

    return list
  }, [porProduto, ticketMed, ticketAnt, clientes, recorrentes, lucro, lucroAnt, insumos, custoProdTotal, receita, eventosFilt, receitaEventos])

  // ── EXPORT CSV ───────────────────────────────────────────────────────────
  function exportarCSV() {
    const linhas = [
      ['Data','Status','Tipo','Valor Total','Lucro Real','Qtd Imas','Forma Pagamento'],
      ...pedsFilt.map(p => [
        new Date(p.created_at).toLocaleDateString('pt-BR'),
        p.status, p.tipo,
        Number(p.valor_total  || 0).toFixed(2),
        Number(p.lucro_real   || 0).toFixed(2),
        p.qtd_imas || 0,
        p.forma_pagamento || '',
      ]),
    ]
    const csv  = linhas.map(l => l.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'relatorio-reviva.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── EXPORT PDF ───────────────────────────────────────────────────────────
  async function exportarPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFontSize(16); doc.text('Relatorio Reviva Imas', 14, 20)
    doc.setFontSize(10)
    doc.text(`Periodo: ${PERIODOS.find(p => p.key === periodo)?.label ?? periodo}`, 14, 30)
    doc.text(`Receita:      ${formatCurrency(receita)}`,    14, 42)
    doc.text(`Lucro:        ${formatCurrency(lucro)}`,      14, 50)
    doc.text(`Pedidos:      ${qtdPeds}`,                    14, 58)
    doc.text(`Ticket Medio: ${formatCurrency(ticketMed)}`,  14, 66)
    doc.text(`Clientes:     ${clientes.length}`,            14, 74)
    if (porProduto.length > 0) {
      doc.text('Produtos:', 14, 86)
      porProduto.forEach(([nome, info], i) => {
        doc.text(`  ${nome}: ${info.qtd}x | ${formatCurrency(info.faturamento)}`, 14, 94 + i * 8)
      })
    }
    doc.save('relatorio-reviva.pdf')
  }

  // ── KPI CARD ─────────────────────────────────────────────────────────────
  function KpiCard({ label, valor, anterior, fmt = 'moeda' }: {
    label: string; valor: number; anterior?: number; fmt?: 'moeda' | 'numero'
  }) {
    const change = anterior !== undefined ? pctChange(valor, anterior) : null
    const txt    = fmt === 'moeda' ? formatCurrency(valor) : valor.toLocaleString('pt-BR')
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900">{txt}</p>
        {change !== null && (
          <p className={`text-xs mt-1 flex items-center gap-0.5 ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(change)}% vs ant.
          </p>
        )}
      </div>
    )
  }

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#b5005e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="pb-28">

      {/* HEADER */}
      <div className="px-4 pt-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BI / Relatorios</h1>
            <p className="text-xs text-gray-400">Analise do negocio</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={exportarCSV}
              className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-2 rounded-xl font-semibold active:scale-95 transition-all">
              <Download size={12} /> Excel
            </button>
            <button onClick={exportarPDF}
              className="flex items-center gap-1 text-xs bg-[#b5005e] text-white px-3 py-2 rounded-xl font-semibold active:scale-95 transition-all">
              <Download size={12} /> PDF
            </button>
          </div>
        </div>

        {/* FILTRO PERÍODO */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodo === p.key ? 'bg-white text-[#b5005e] shadow-sm' : 'text-gray-500'
              }`}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* ABAS */}
      <div className="px-4 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {ABAS.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                aba === a.key ? 'bg-[#b5005e] text-white shadow-sm' : 'bg-gray-100 text-gray-600'
              }`}>{a.emoji} {a.label}</button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* ══ VISAO GERAL ══════════════════════════════════════════════════ */}
        {aba === 'geral' && <>
          <div className="grid grid-cols-2 gap-2">
            <KpiCard label="💰 Receita"    valor={receita}   anterior={receitaAnt} />
            <KpiCard label="💵 Lucro"      valor={lucro}     anterior={lucroAnt} />
            <KpiCard label="📦 Pedidos"    valor={qtdPeds}   anterior={qtdPedsAnt} fmt="numero" />
            <KpiCard label="📈 Ticket Med" valor={ticketMed} anterior={ticketAnt} />
            <KpiCard label="👥 Clientes"   valor={clientes.length} fmt="numero" />
            <KpiCard label="🎉 Eventos"    valor={eventos.length}  fmt="numero" />
          </div>

          {receitaPorMes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Receita por mes</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={receitaPorMes.slice(-12)}>
                  <defs>
                    <linearGradient id="gRecGeral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#b5005e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#b5005e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={45} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Area type="monotone" dataKey="valor" stroke="#b5005e" fill="url(#gRecGeral)" strokeWidth={2} name="Receita" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {pedsPorMes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Pedidos por mes</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={pedsPorMes.slice(-12)}>
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={25} />
                  <Tooltip />
                  <Bar dataKey="valor" fill="#b5005e" radius={[4,4,0,0]} name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {insights.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-yellow-500" />
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Insights da Reviva</p>
              </div>
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${
                    ins.tipo === 'ok'     ? 'bg-green-50 text-green-800'  :
                    ins.tipo === 'alerta' ? 'bg-red-50 text-red-800'      :
                                           'bg-gray-50 text-gray-700'
                  }`}>
                    <span className="flex-shrink-0">{ins.emoji}</span>
                    <span>{ins.texto}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>}

        {/* ══ FINANCEIRO ═══════════════════════════════════════════════════ */}
        {aba === 'financeiro' && <>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white">
              <p className="text-xs text-pink-200 mb-1">Receita</p>
              <p className="text-xl font-bold">{formatCurrency(receita)}</p>
              {receitaAnt > 0 && <p className={`text-xs mt-1 ${receita >= receitaAnt ? 'text-green-300' : 'text-red-300'}`}>{pctChange(receita,receitaAnt)}% vs ant.</p>}
            </div>
            <div className={`rounded-2xl p-4 text-white ${lucro >= 0 ? 'bg-gradient-to-br from-green-600 to-emerald-700' : 'bg-gradient-to-br from-red-500 to-red-700'}`}>
              <p className="text-xs text-green-200 mb-1">Lucro</p>
              <p className="text-xl font-bold">{formatCurrency(lucro)}</p>
              {lucroAnt !== 0 && <p className={`text-xs mt-1 ${lucro >= lucroAnt ? 'text-green-300' : 'text-red-300'}`}>{pctChange(lucro,lucroAnt)}% vs ant.</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Ticket Medio</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(ticketMed)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Margem</p>
              <p className="text-lg font-bold text-gray-900">{receita > 0 ? Math.round((lucro/receita)*100) : 0}%</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Receita mensal</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={receitaPorMes.slice(-12)}>
                <defs>
                  <linearGradient id="gRecFin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#b5005e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#b5005e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={48} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Area type="monotone" dataKey="valor" stroke="#b5005e" fill="url(#gRecFin)" strokeWidth={2} name="Receita" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Evolucao do lucro</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={lucroPorMes.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={48} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} dot={false} name="Lucro" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {porFormaPag.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Por forma de pagamento</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={porFormaPag} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name"
                    label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {porFormaPag.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>}

        {/* ══ PRODUTOS ═════════════════════════════════════════════════════ */}
        {aba === 'produtos' && (
          porProduto.length === 0 ? (
            <div className="text-center py-20">
              <Package size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Nenhum produto no periodo selecionado</p>
            </div>
          ) : <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Faturamento por produto</p>
              <ResponsiveContainer width="100%" height={Math.max(160, porProduto.length * 36)}>
                <BarChart
                  data={porProduto.map(([nome, info]) => ({
                    nome: nome.length > 14 ? nome.slice(0,13)+'…' : nome,
                    valor: info.faturamento,
                  }))}
                  layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Bar dataKey="valor" fill="#b5005e" radius={[0,4,4,0]} name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {porProduto.map(([nome, info], i) => (
                <div key={nome} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: CORES[i % CORES.length] }}>{i + 1}</div>
                    <p className="text-sm font-semibold text-gray-900">{nome}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-400">Vendidos</p>
                      <p className="text-sm font-bold text-gray-900">{info.qtd}x</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-400">Receita</p>
                      <p className="text-xs font-bold text-blue-700">{formatCurrency(info.faturamento)}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-400">Lucro est.</p>
                      <p className="text-xs font-bold text-green-700">{formatCurrency(info.lucro)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══ CLIENTES ═════════════════════════════════════════════════════ */}
        {aba === 'clientes' && <>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{clientes.length}</p>
            </div>
            <div className="bg-green-50 rounded-2xl border border-green-200 shadow-sm p-4">
              <p className="text-xs text-green-600 mb-1">Recorrentes</p>
              <p className="text-2xl font-bold text-green-700">{recorrentes}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-4">
              <p className="text-xs text-blue-600 mb-1">Novos este mes</p>
              <p className="text-2xl font-bold text-blue-700">{clientesNovos}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Ticket medio</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(ticketMed)}</p>
            </div>
          </div>

          {clientesPorMes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Novos clientes por mes</p>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={clientesPorMes.slice(-12)}>
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={25} />
                  <Tooltip />
                  <Bar dataKey="valor" fill="#3b82f6" radius={[4,4,0,0]} name="Novos clientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Ranking — maiores compradores</p>
            <div className="space-y-0.5">
              {rankingClients.map((c, i) => (
                <Link key={c.id} href={`/clientes/${c.id}`}
                  className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 active:opacity-60 transition-opacity">
                  <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#b5005e]">{(c.nome || '?').slice(0,2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                    <p className="text-xs text-gray-400">{Number(c.num_pedidos || 0)} pedido(s)</p>
                  </div>
                  <p className="text-sm font-bold text-green-700 flex-shrink-0">{formatCurrency(Number(c.total_gasto || 0))}</p>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </Link>
              ))}
              {clientes.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Nenhum cliente cadastrado</p>}
            </div>
          </div>
        </>}

        {/* ══ PRODUCAO ═════════════════════════════════════════════════════ */}
        {aba === 'producao' && <>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Pedidos no periodo</p>
              <p className="text-2xl font-bold text-gray-900">{qtdPeds}</p>
            </div>
            <div className="bg-green-50 rounded-2xl border border-green-200 shadow-sm p-4">
              <p className="text-xs text-green-600 mb-1">Entregues / Finalizados</p>
              <p className="text-2xl font-bold text-green-700">
                {pedsFilt.filter(p => p.status === 'entregue' || p.status === 'finalizado').length}
              </p>
            </div>
            <div className="bg-orange-50 rounded-2xl border border-orange-200 shadow-sm p-4">
              <p className="text-xs text-orange-600 mb-1">Custos de prod.</p>
              <p className="text-lg font-bold text-orange-700">{formatCurrency(custoProdTotal)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Custo medio/ped.</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(custoProdMedio)}</p>
            </div>
          </div>

          {statusCount.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Pedidos por status</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusCount} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name"
                    label={({ name, value }: any) => `${name}: ${value}`} fontSize={10}>
                    {statusCount.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {custosFilt.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Custos lancados ({custosFilt.length})</p>
              <div className="space-y-1">
                {custosFilt.slice(0, 15).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{c.descricao}</p>
                      <p className="text-[10px] text-gray-400">{new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <p className="text-xs font-bold text-orange-600">-{formatCurrency(Number(c.valor))}</p>
                  </div>
                ))}
                {custosFilt.length > 15 && <p className="text-xs text-gray-400 pt-1">+ {custosFilt.length - 15} registros</p>}
              </div>
            </div>
          )}
        </>}

        {/* ══ ESTOQUE ══════════════════════════════════════════════════════ */}
        {aba === 'estoque' && <>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Materiais</p>
              <p className="text-2xl font-bold text-gray-900">{insumos.length}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-4">
              <p className="text-xs text-blue-600 mb-1">Valor em estoque</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(valorEstoque)}</p>
            </div>
            <div className="bg-red-50 rounded-2xl border border-red-200 shadow-sm p-4">
              <p className="text-xs text-red-600 mb-1">Abaixo do min.</p>
              <p className="text-2xl font-bold text-red-700">
                {insumos.filter(i => Number(i.quantidade || 0) < Number(i.quantidade_minima || 0)).length}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-1">Compras no periodo</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(movEstoque.filter(m => m.tipo === 'entrada' && new Date(m.data + 'T00:00:00') >= inicio).reduce((s, m) => s + Number(m.valor_pago || 0), 0))}
              </p>
            </div>
          </div>

          {consumoPorMat.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Consumo por material</p>
              <ResponsiveContainer width="100%" height={Math.max(160, consumoPorMat.length * 32)}>
                <BarChart
                  data={consumoPorMat.map(([nome, qtd]) => ({
                    nome: nome.length > 16 ? nome.slice(0,15)+'…' : nome, qtd,
                  }))}
                  layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={95} />
                  <Tooltip />
                  <Bar dataKey="qtd" fill="#10b981" radius={[0,4,4,0]} name="Consumo" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Estoque atual</p>
            <div className="space-y-0.5">
              {insumos.map(i => {
                const qtd  = Number(i.quantidade        || 0)
                const min  = Number(i.quantidade_minima || 0)
                const val  = Number(i.valor_unitario    || 0)
                const baixo = min > 0 && qtd < min
                return (
                  <div key={i.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-xs font-semibold text-gray-900 truncate">{i.nome}</p>
                      <p className="text-[10px] text-gray-400">{qtd} {i.unidade || 'un'} · {formatCurrency(qtd * val)}</p>
                    </div>
                    {baixo
                      ? <span className="text-[10px] font-bold text-red-600 flex-shrink-0">⚠️ Baixo</span>
                      : <span className="text-[10px] text-green-600 flex-shrink-0">OK</span>
                    }
                  </div>
                )
              })}
              {insumos.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Nenhum material cadastrado</p>}
            </div>
          </div>
        </>}

        {/* ══ EVENTOS ══════════════════════════════════════════════════════ */}
        {aba === 'eventos' && (
          eventos.length === 0 ? (
            <div className="text-center py-20">
              <PartyPopper size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum evento cadastrado ainda</p>
              <p className="text-xs text-gray-400 mt-1">Eventos aparecerao aqui assim que forem criados</p>
              <Link href="/eventos"
                className="inline-block mt-4 bg-[#b5005e] text-white px-6 py-2.5 rounded-xl font-medium text-sm active:scale-95 transition-all">
                Ir para Eventos
              </Link>
            </div>
          ) : <>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-1">Total de eventos</p>
                <p className="text-2xl font-bold text-gray-900">{eventos.length}</p>
              </div>
              <div className="bg-[#b5005e]/10 rounded-2xl border border-[#b5005e]/20 shadow-sm p-4">
                <p className="text-xs text-[#b5005e] mb-1">No periodo</p>
                <p className="text-2xl font-bold text-[#b5005e]">{eventosFilt.length}</p>
              </div>
              <div className="col-span-2 bg-green-50 rounded-2xl border border-green-200 shadow-sm p-4">
                <p className="text-xs text-green-600 mb-1">Receita dos eventos no periodo</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(receitaEventos)}</p>
                {eventosFilt.length > 0 && (
                  <p className="text-xs text-green-500 mt-0.5">Ticket medio: {formatCurrency(receitaEventos / eventosFilt.length)}</p>
                )}
              </div>
            </div>

            {eventosFilt.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Eventos no periodo</p>
                <div className="space-y-0.5">
                  {eventosFilt.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{e.nome}</p>
                        <p className="text-xs text-gray-400">{new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-700">{formatCurrency(Number(e.valor_total || 0))}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          e.status === 'realizado'  ? 'bg-green-100 text-green-700'  :
                          e.status === 'cancelado'  ? 'bg-red-100 text-red-600'      :
                                                      'bg-yellow-100 text-yellow-700'
                        }`}>{e.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* todos eventos */}
            {eventosFilt.length < eventos.length && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Todos os eventos</p>
                <div className="space-y-0.5">
                  {eventos.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{e.nome}</p>
                        <p className="text-xs text-gray-400">{new Date(e.data + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-700">{formatCurrency(Number(e.valor_total || 0))}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          e.status === 'realizado'  ? 'bg-green-100 text-green-700'  :
                          e.status === 'cancelado'  ? 'bg-red-100 text-red-600'      :
                                                      'bg-yellow-100 text-yellow-700'
                        }`}>{e.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
