'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/formatters'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Link from 'next/link'
import {
  ChevronDown, ArrowUpRight, ArrowDownRight,
  TrendingUp, Heart, Download, ChevronRight,
} from 'lucide-react'

// ── HELPERS ────────────────────────────────────────────────────────────────
const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function fmtMes(iso: string): string {
  const d = new Date(iso + '-01')
  return d.toLocaleDateString('pt-BR', { month: 'short' })
}

function groupByMonth(items: any[], dateKey: string, valueKey: string | null, countOnly = false) {
  const map: Record<string, number> = {}
  items.forEach(item => {
    const ds = item[dateKey] as string
    if (!ds) return
    const d   = new Date(ds)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) map[key] = 0
    if (countOnly)     map[key]++
    else if (valueKey) map[key] += Number(item[valueKey] || 0)
  })
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, valor]) => ({ mes: fmtMes(mes), valor }))
}

function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((cur - prev) / Math.abs(prev)) * 100)
}

function numChange(cur: number, prev: number): number {
  return cur - prev
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const hoje       = new Date()
  const [mes,  setMes]  = useState(hoje.getMonth())
  const [ano,  setAno]  = useState(hoje.getFullYear())
  const [open,  setOpen]  = useState(false)
  const [loading, setLoading] = useState(true)

  const [pedidos,        setPedidos]        = useState<any[]>([])
  const [itens,          setItens]          = useState<any[]>([])
  const [clientes,       setClientes]       = useState<any[]>([])

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario }  = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const eid = usuario!.empresa_id

      const [{ data: peds }, { data: cls }] = await Promise.all([
        supabase.from('pedidos')
          .select('id,created_at,status,tipo,valor_total,lucro_real,qtd_imas,forma_pagamento,cliente_id')
          .eq('empresa_id', eid).neq('status', 'cancelado').order('created_at'),
        supabase.from('clientes')
          .select('id,nome,num_pedidos,total_gasto,created_at,whatsapp')
          .eq('empresa_id', eid).order('total_gasto', { ascending: false }),
      ])

      setPedidos(peds || [])
      setClientes(cls || [])

      const pedIds = (peds || []).map((p: any) => p.id)
      if (pedIds.length > 0) {
        const { data: its } = await supabase
          .from('itens_pedido').select('pedido_id,nome_produto,quantidade,subtotal').in('pedido_id', pedIds)
        setItens(its || [])
      }
      setLoading(false)
    }
    carregar()
  }, [])

  // ── PERÍODOS ──────────────────────────────────────────────────────────────
  const inicioMes  = useMemo(() => new Date(ano, mes, 1),   [ano, mes])
  const fimMes     = useMemo(() => new Date(ano, mes + 1, 0, 23, 59, 59), [ano, mes])
  const inicioAnt  = useMemo(() => new Date(ano, mes - 1, 1), [ano, mes])
  const fimAnt     = useMemo(() => new Date(ano, mes, 0, 23, 59, 59), [ano, mes])

  // apenas venda (nao mimo)
  const isVenda = (p: any) => p.tipo !== 'mimo'
  const inPeriod = (p: any, ini: Date, fim: Date) => {
    const d = new Date(p.created_at)
    return d >= ini && d <= fim
  }

  const pedsMes = useMemo(() => pedidos.filter(p => isVenda(p) && inPeriod(p, inicioMes, fimMes)), [pedidos, inicioMes, fimMes])
  const pedsAnt = useMemo(() => pedidos.filter(p => isVenda(p) && inPeriod(p, inicioAnt, fimAnt)), [pedidos, inicioAnt, fimAnt])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const receita    = useMemo(() => pedsMes.reduce((s, p) => s + Number(p.valor_total || 0), 0), [pedsMes])
  const lucro      = useMemo(() => pedsMes.reduce((s, p) => s + Number(p.lucro_real  || 0), 0), [pedsMes])
  const qtdPeds    = pedsMes.length
  const ticketMed  = qtdPeds > 0 ? receita / qtdPeds : 0

  const receitaAnt = useMemo(() => pedsAnt.reduce((s, p) => s + Number(p.valor_total || 0), 0), [pedsAnt])
  const lucroAnt   = useMemo(() => pedsAnt.reduce((s, p) => s + Number(p.lucro_real  || 0), 0), [pedsAnt])
  const qtdPedsAnt = pedsAnt.length

  const clientesNovos    = useMemo(() => clientes.filter(c => {
    const d = new Date(c.created_at)
    return d >= inicioMes && d <= fimMes
  }).length, [clientes, inicioMes, fimMes])

  const clientesNovosAnt = useMemo(() => clientes.filter(c => {
    const d = new Date(c.created_at)
    return d >= inicioAnt && d <= fimAnt
  }).length, [clientes, inicioAnt, fimAnt])

  // ── PRODUTOS ──────────────────────────────────────────────────────────────
  const porProduto = useMemo(() => {
    const pedSet   = new Set(pedsMes.map(p => p.id))
    const valorMap: Record<string, number> = {}
    const lucroMap: Record<string, number> = {}
    pedsMes.forEach(p => { valorMap[p.id] = Number(p.valor_total || 0); lucroMap[p.id] = Number(p.lucro_real || 0) })
    const map: Record<string, { qtd: number; faturamento: number }> = {}
    itens.filter(i => pedSet.has(i.pedido_id)).forEach(item => {
      const nome = item.nome_produto || 'Outros'
      if (!map[nome]) map[nome] = { qtd: 0, faturamento: 0 }
      map[nome].qtd         += Number(item.quantidade || 0)
      map[nome].faturamento += Number(item.subtotal   || 0)
    })
    return Object.entries(map).sort((a, b) => b[1].qtd - a[1].qtd)
  }, [pedsMes, itens])

  const kitMaisVendido = porProduto[0]

  // ── EVOLUCAO MENSAL (12 meses) ───────────────────────────────────────────
  const evolucao = useMemo(() => groupByMonth(pedidos.filter(isVenda), 'created_at', 'valor_total').slice(-12), [pedidos])

  // ── RANKING CLIENTES ─────────────────────────────────────────────────────
  // clientes com pedidos neste mes
  const pedsMesClienteIds = useMemo(() => {
    const map: Record<string, number> = {}
    pedsMes.forEach(p => {
      if (p.cliente_id) map[p.cliente_id] = (map[p.cliente_id] || 0) + Number(p.valor_total || 0)
    })
    return map
  }, [pedsMes])

  const rankingMes = useMemo(() => {
    return clientes
      .filter(c => pedsMesClienteIds[c.id] !== undefined)
      .sort((a, b) => (pedsMesClienteIds[b.id] || 0) - (pedsMesClienteIds[a.id] || 0))
      .slice(0, 5)
  }, [clientes, pedsMesClienteIds])

  // se nao houver clientes no mes, usa ranking geral
  const rankingFinal = rankingMes.length > 0
    ? rankingMes
    : [...clientes].sort((a, b) => Number(b.total_gasto || 0) - Number(a.total_gasto || 0)).slice(0, 5)

  // ── EXPORT CSV ───────────────────────────────────────────────────────────
  function exportarCSV() {
    const linhas = [
      ['Data','Status','Tipo','Valor Total','Lucro Real','Forma Pagamento'],
      ...pedsMes.map(p => [
        new Date(p.created_at).toLocaleDateString('pt-BR'),
        p.status, p.tipo,
        Number(p.valor_total || 0).toFixed(2),
        Number(p.lucro_real  || 0).toFixed(2),
        p.forma_pagamento || '',
      ]),
    ]
    const csv  = linhas.map(l => l.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `relatorio-${MESES[mes].toLowerCase()}-${ano}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // ── DELTA COMPONENT ──────────────────────────────────────────────────────
  function Delta({ cur, prev, tipo = 'pct' }: { cur: number; prev: number; tipo?: 'pct' | 'abs' }) {
    const val = tipo === 'pct' ? pctChange(cur, prev) : numChange(cur, prev)
    if (val === null || val === 0) return null
    const up = val > 0
    return (
      <span className={`flex items-center gap-0.5 text-xs font-semibold mt-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
        {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        {tipo === 'pct' ? `${Math.abs(val)}%` : (up ? `+${val}` : `${val}`)}
        {' '}vs mês ant.
      </span>
    )
  }

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#b5005e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const maxQtd = porProduto.length > 0 ? porProduto[0][1].qtd : 1

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="pb-28">

      {/* HEADER */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📊 BI Reviva</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarCSV}
            className="w-9 h-9 rounded-xl bg-green-600 text-white flex items-center justify-center active:scale-95 transition-all">
            <Download size={15} />
          </button>
        </div>
      </div>

      {/* SELETOR DE MÊS */}
      <div className="px-4 mb-5">
        <div className="relative">
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm active:scale-[0.98] transition-all">
            {MESES[mes]} {ano}
            <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg z-20 overflow-hidden w-48">
              {/* ano anterior e atual */}
              {[ano - 1, ano].flatMap(y =>
                MESES.map((m, idx) => {
                  const futuro = y > hoje.getFullYear() || (y === hoje.getFullYear() && idx > hoje.getMonth())
                  if (futuro) return null
                  const sel = y === ano && idx === mes
                  return (
                    <button key={`${y}-${idx}`} onClick={() => { setAno(y); setMes(idx); setOpen(false) }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${sel ? 'bg-[#b5005e] text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                      {m} {y}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
        {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      </div>

      <div className="px-4 space-y-3">

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-2.5">

          {/* Receita */}
          <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white">
            <p className="text-xs text-pink-200 font-medium mb-0.5">💰 Receita</p>
            <p className="text-2xl font-bold">{formatCurrency(receita)}</p>
            {receitaAnt > 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold mt-1 ${receita >= receitaAnt ? 'text-green-300' : 'text-red-300'}`}>
                {receita >= receitaAnt ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {Math.abs(pctChange(receita, receitaAnt) ?? 0)}% vs ant.
              </span>
            )}
          </div>

          {/* Lucro */}
          <div className={`rounded-2xl p-4 text-white ${lucro >= 0 ? 'bg-gradient-to-br from-green-600 to-emerald-700' : 'bg-gradient-to-br from-red-500 to-red-700'}`}>
            <p className="text-xs text-green-200 font-medium mb-0.5">💵 Lucro</p>
            <p className="text-2xl font-bold">{formatCurrency(lucro)}</p>
            {lucroAnt !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-semibold mt-1 ${lucro >= lucroAnt ? 'text-green-300' : 'text-red-300'}`}>
                {lucro >= lucroAnt ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {Math.abs(pctChange(lucro, lucroAnt) ?? 0)}% vs ant.
              </span>
            )}
          </div>

          {/* Pedidos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 font-medium mb-0.5">📦 Pedidos</p>
            <p className="text-3xl font-bold text-gray-900">{qtdPeds}</p>
            <Delta cur={qtdPeds} prev={qtdPedsAnt} tipo="abs" />
          </div>

          {/* Clientes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 font-medium mb-0.5">👥 Clientes</p>
            <p className="text-3xl font-bold text-gray-900">{clientes.length}</p>
            {clientesNovos > 0 && (
              <span className="text-xs text-green-600 font-semibold mt-0.5 block">+{clientesNovos} novos</span>
            )}
          </div>

          {/* Ticket Médio */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 font-medium mb-0.5">🎯 Ticket Médio</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(ticketMed)}</p>
          </div>

          {/* Kit mais vendido */}
          <div className="bg-pink-50 rounded-2xl border border-pink-200 shadow-sm p-4">
            <div className="flex items-center gap-1 mb-0.5">
              <Heart size={12} className="text-[#b5005e]" />
              <p className="text-xs text-[#b5005e] font-medium">Kit mais vendido</p>
            </div>
            {kitMaisVendido ? (
              <>
                <p className="text-sm font-bold text-gray-900 truncate">{kitMaisVendido[0]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{kitMaisVendido[1].qtd} venda{kitMaisVendido[1].qtd !== 1 ? 's' : ''}</p>
              </>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Sem dados</p>
            )}
          </div>
        </div>

        {/* EVOLUÇÃO MENSAL */}
        {evolucao.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={15} className="text-[#b5005e]" />
              <p className="text-sm font-bold text-gray-800">Evolução mensal</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={evolucao}>
                <defs>
                  <linearGradient id="gEv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#b5005e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#b5005e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={44} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Receita']} />
                <Area type="monotone" dataKey="valor" stroke="#b5005e" fill="url(#gEv)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* PRODUTOS */}
        {porProduto.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">📦 Produtos</p>
            <div className="space-y-3">
              {porProduto.map(([nome, info], i) => {
                const barPct = maxQtd > 0 ? (info.qtd / maxQtd) * 100 : 0
                return (
                  <div key={nome}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 truncate max-w-[55%]">{nome}</span>
                      <span className="text-xs text-gray-500">{info.qtd}x · {formatCurrency(info.faturamento)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: i === 0 ? '#b5005e' : i === 1 ? '#10b981' : i === 2 ? '#3b82f6' : '#f59e0b',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* CLIENTES QUE MAIS COMPRARAM */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">
            👥 {rankingMes.length > 0 ? 'Clientes que mais compraram' : 'Top clientes (geral)'}
          </p>
          {rankingFinal.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum cliente com pedidos neste mês</p>
          ) : (
            <div className="space-y-0.5">
              {rankingFinal.map((c, i) => {
                const valorMes = pedsMesClienteIds[c.id] || Number(c.total_gasto || 0)
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}°`
                return (
                  <Link key={c.id} href={`/clientes/${c.id}`}
                    className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 active:opacity-60 transition-opacity">
                    <span className="text-base w-7 text-center flex-shrink-0">{medal}</span>
                    <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#b5005e]">{(c.nome || '?').slice(0,2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                      <p className="text-xs text-gray-400">{Number(c.num_pedidos || 0)} pedido(s) total</p>
                    </div>
                    <p className="text-sm font-bold text-green-700 flex-shrink-0">{formatCurrency(valorMes)}</p>
                    <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* MARGEM E PAGAMENTO */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">📊 Margem</p>
            <p className="text-3xl font-bold text-gray-900">{receita > 0 ? Math.round((lucro/receita)*100) : 0}%</p>
            <p className="text-xs text-gray-400 mt-0.5">lucro / receita</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">🏭 Ímãs vendidos</p>
            <p className="text-3xl font-bold text-gray-900">
              {pedsMes.reduce((s, p) => s + Number(p.qtd_imas || 0), 0)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">no mês</p>
          </div>
        </div>

        {/* VAZIO */}
        {pedsMes.length === 0 && (
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm font-semibold text-gray-600">Nenhum pedido em {MESES[mes]}</p>
            <p className="text-xs text-gray-400 mt-1">Selecione outro mês ou aguarde novos pedidos</p>
          </div>
        )}

      </div>
    </div>
  )
}
