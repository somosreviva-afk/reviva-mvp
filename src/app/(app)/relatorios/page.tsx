'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/formatters'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import Link from 'next/link'
import {
  ChevronDown, ArrowUpRight, ArrowDownRight,
  TrendingUp, Heart, Download, ChevronRight, Lightbulb,
  MessageCircle, MapPin, Users, Target, AlertTriangle, Package,
} from 'lucide-react'
import { calcularConsumo } from '@/lib/utils/estoque'

// ── CONSTANTES ─────────────────────────────────────────────────────────────
const MESES = [
  'Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

type Gran     = 'mes' | 'semana' | 'dia'
type Aba      = 'geral' | 'fin' | 'cli' | 'est'
type SubEst   = 'visao' | 'consumo' | 'invest' | 'giro' | 'reposicao' | 'capacidade' | 'curvaABC' | 'insights'
type SubCli   = 'visao' | 'crescimento' | 'fidelizacao' | 'ranking' | 'inativos' | 'localizacao' | 'ticket' | 'insights' | 'oportunidades'

// ── HELPERS ────────────────────────────────────────────────────────────────
function naoMimo(p: any) { return p.tipo !== 'mimo' }

function pedidoNoMes(p: any, ano: number, mes: number): boolean {
  const d = new Date(p.created_at)
  return d.getFullYear() === ano && d.getMonth() === mes
}

function pedidoNoMesAnterior(p: any, ano: number, mes: number): boolean {
  const antMes = mes === 0 ? 11 : mes - 1
  const antAno = mes === 0 ? ano - 1 : ano
  const d = new Date(p.created_at)
  return d.getFullYear() === antAno && d.getMonth() === antMes
}

function fmtMesLabel(isoMes: string): string {
  return new Date(isoMes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function fmtDiaLabel(ds: string): string {
  return new Date(ds.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fmtData(ds: string): string {
  return new Date(ds.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function getWeekStart(ds: string): string {
  const d = new Date(ds.slice(0, 10) + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d.toISOString().split('T')[0]
}

function groupByMes(items: any[], dateKey: string, valueKey: string): { periodo: string; valor: number }[] {
  const map: Record<string, number> = {}
  items.forEach(item => {
    const ds = (item[dateKey] as string || '').split('T')[0]
    if (!ds || ds.length < 7) return
    const key = ds.slice(0, 7)
    map[key] = (map[key] || 0) + Number(item[valueKey] || 0)
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ periodo: fmtMesLabel(k), valor: v }))
}

function groupBySemana(items: any[], dateKey: string, valueKey: string): { periodo: string; valor: number }[] {
  const map: Record<string, number> = {}
  items.forEach(item => {
    const ds = (item[dateKey] as string || '').split('T')[0]
    if (!ds) return
    const key = getWeekStart(ds)
    map[key] = (map[key] || 0) + Number(item[valueKey] || 0)
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ periodo: fmtDiaLabel(k), valor: v }))
}

function groupByDia(items: any[], dateKey: string, valueKey: string): { periodo: string; valor: number; key: string }[] {
  const map: Record<string, number> = {}
  items.forEach(item => {
    const ds = (item[dateKey] as string || '').split('T')[0]
    if (!ds) return
    map[ds] = (map[ds] || 0) + Number(item[valueKey] || 0)
  })
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ key: k, periodo: fmtDiaLabel(k), valor: v }))
}

function pct(cur: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((cur - prev) / Math.abs(prev)) * 100)
}

function deltaEl(cur: number, prev: number, invert = false) {
  const val = pct(cur, prev)
  if (val === null || val === 0) return null
  const positivo = invert ? val < 0 : val > 0
  const cor   = positivo ? 'text-green-600' : 'text-red-500'
  const Icon  = val > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold mt-0.5 ${cor}`}>
      <Icon size={12} />{Math.abs(val)}% vs mes ant.
    </span>
  )
}

function diasAtras(ds: string): number {
  const d = new Date(ds.slice(0, 10) + 'T12:00:00')
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

// ── COMPONENTE ─────────────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const hoje  = new Date()
  const [aba,        setAba]        = useState<Aba>('geral')
  const [subAbaCli,  setSubAbaCli]  = useState<SubCli>('visao')
  const [subAbaEst,  setSubAbaEst]  = useState<SubEst>('visao')
  const [mes,        setMes]        = useState(hoje.getMonth())
  const [ano,        setAno]        = useState(hoje.getFullYear())
  const [open,       setOpen]       = useState(false)
  const [gran,       setGran]       = useState<Gran>('mes')
  const [loading,    setLoading]    = useState(true)

  const [pedidos,        setPedidos]        = useState<any[]>([])
  const [itens,          setItens]          = useState<any[]>([])
  const [clientes,       setClientes]       = useState<any[]>([])
  const [financeiro,     setFinanceiro]     = useState<any[]>([])
  const [movEstoque,     setMovEstoque]     = useState<any[]>([])
  const [custosProducao, setCustosProducao] = useState<any[]>([])
  const [insumos,        setInsumos]        = useState<any[]>([])
  const [tamanhoKits,   setTamanhoKits]   = useState<number[]>([])

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario }  = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const eid = usuario!.empresa_id

      const [{ data: peds }, { data: cls }, { data: fin }, { data: movs }, { data: custos }] = await Promise.all([
        supabase.from('pedidos')
          .select('id,created_at,status,tipo,valor_total,lucro_real,qtd_imas,forma_pagamento,cliente_id,custo_total_pedido')
          .eq('empresa_id', eid).neq('status', 'cancelado').order('created_at'),
        supabase.from('clientes')
          .select('id,nome,num_pedidos,total_gasto,created_at,whatsapp,cidade,estado')
          .eq('empresa_id', eid).order('total_gasto', { ascending: false }),
        supabase.from('financeiro')
          .select('id,data,tipo,valor,descricao,categoria')
          .eq('empresa_id', eid).order('data'),
        supabase.from('movimentacoes_estoque')
          .select('id,data,tipo,quantidade,valor_pago,insumos(nome)')
          .eq('empresa_id', eid).order('data'),
        supabase.from('custos_producao')
          .select('id,data,descricao,valor')
          .eq('empresa_id', eid).order('data'),
      ])

      // insumos + kit sizes (for estoque tab)
      const [{ data: ins }, { data: kits }] = await Promise.all([
        supabase.from('insumos').select('id,tipo,nome,unidade,quantidade,estoque_minimo,custo_unitario').eq('empresa_id', eid).order('nome'),
        supabase.from('pedidos').select('qtd_imas').eq('empresa_id', eid).gt('qtd_imas', 0),
      ])
      setInsumos(ins || [])
      const ktUnicos = [...new Set((kits || []).map((p: any) => Number(p.qtd_imas)))].filter(v => v > 0).sort((a,b)=>a-b)
      setTamanhoKits(ktUnicos)

      setPedidos(peds || [])
      setClientes(cls || [])
      setFinanceiro(fin || [])
      setMovEstoque(movs || [])
      setCustosProducao(custos || [])

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

  // ── FILTROS DE PERÍODO ───────────────────────────────────────────────────
  const mesStr       = String(mes + 1).padStart(2, '0')
  const inicioStr    = useMemo(() => `${ano}-${mesStr}-01`, [ano, mes])
  const fimStr       = useMemo(() => `${ano}-${mesStr}-31`, [ano, mes])
  const antMes       = mes === 0 ? 11 : mes - 1
  const antAno       = mes === 0 ? ano - 1 : ano
  const antMesStr    = String(antMes + 1).padStart(2, '0')
  const inicioAntStr = useMemo(() => `${antAno}-${antMesStr}-01`, [ano, mes])
  const fimAntStr    = useMemo(() => `${antAno}-${antMesStr}-31`,  [ano, mes])

  const inDate = (ds: string, ini: string, fim: string) => ds >= ini && ds <= fim

  // ── PEDIDOS ──────────────────────────────────────────────────────────────
  const pedsMes = useMemo(() => pedidos.filter(p => naoMimo(p) && pedidoNoMes(p, ano, mes)), [pedidos, ano, mes])
  const pedsAnt = useMemo(() => pedidos.filter(p => naoMimo(p) && pedidoNoMesAnterior(p, ano, mes)), [pedidos, ano, mes])

  // ── DADOS FINANCEIROS ────────────────────────────────────────────────────
  const finMes        = useMemo(() => financeiro.filter(f => inDate(f.data, inicioStr, fimStr)), [financeiro, inicioStr, fimStr])
  const finAnt        = useMemo(() => financeiro.filter(f => inDate(f.data, inicioAntStr, fimAntStr)), [financeiro, inicioAntStr, fimAntStr])
  const comprasMes    = useMemo(() => movEstoque.filter(m => m.tipo === 'entrada' && m.valor_pago && inDate(m.data, inicioStr, fimStr)), [movEstoque, inicioStr, fimStr])
  const comprasAnt    = useMemo(() => movEstoque.filter(m => m.tipo === 'entrada' && m.valor_pago && inDate(m.data, inicioAntStr, fimAntStr)), [movEstoque, inicioAntStr, fimAntStr])
  const custProdMes   = useMemo(() => custosProducao.filter(c => inDate(c.data, inicioStr, fimStr)), [custosProducao, inicioStr, fimStr])
  const custProdAnt   = useMemo(() => custosProducao.filter(c => inDate(c.data, inicioAntStr, fimAntStr)), [custosProducao, inicioAntStr, fimAntStr])

  const receitaMes    = useMemo(() => pedsMes.reduce((s, p) => s + Number(p.valor_total || 0), 0), [pedsMes])
  const lucroMes      = useMemo(() => pedsMes.reduce((s, p) => s + Number(p.lucro_real  || 0), 0), [pedsMes])
  const qtdPeds       = pedsMes.length
  const ticketMed     = qtdPeds > 0 ? receitaMes / qtdPeds : 0
  const entradasMes   = useMemo(() => finMes.filter(f => f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor || 0), 0), [finMes])
  const saidasMes     = useMemo(() => finMes.filter(f => f.tipo === 'saida').reduce((s, f) => s + Number(f.valor || 0), 0), [finMes])
  const comprasValMes = useMemo(() => comprasMes.reduce((s, m) => s + Number(m.valor_pago || 0), 0), [comprasMes])
  const custoProdVal  = useMemo(() => custProdMes.reduce((s, c) => s + Number(c.valor || 0), 0), [custProdMes])

  const saldoConta  = receitaMes + entradasMes - saidasMes - comprasValMes - custoProdVal
  const margem      = receitaMes > 0 ? Math.round((lucroMes / receitaMes) * 100) : 0
  const totalDesp   = comprasValMes + custoProdVal + saidasMes

  const receitaAnt      = useMemo(() => pedsAnt.reduce((s, p) => s + Number(p.valor_total || 0), 0), [pedsAnt])
  const lucroAnt        = useMemo(() => pedsAnt.reduce((s, p) => s + Number(p.lucro_real  || 0), 0), [pedsAnt])
  const entradasAnt     = useMemo(() => finAnt.filter(f => f.tipo === 'entrada').reduce((s, f) => s + Number(f.valor || 0), 0), [finAnt])
  const saidasAnt       = useMemo(() => finAnt.filter(f => f.tipo === 'saida').reduce((s, f) => s + Number(f.valor || 0), 0), [finAnt])
  const comprasAntVal   = useMemo(() => comprasAnt.reduce((s, m) => s + Number(m.valor_pago || 0), 0), [comprasAnt])
  const custoProdAntVal = useMemo(() => custProdAnt.reduce((s, c) => s + Number(c.valor || 0), 0), [custProdAnt])
  const saldoAnt        = receitaAnt + entradasAnt - saidasAnt - comprasAntVal - custoProdAntVal
  const margemAnt       = receitaAnt > 0 ? Math.round((lucroAnt / receitaAnt) * 100) : 0

  // ── COMPOSIÇÃO RECEITAS/DESPESAS ─────────────────────────────────────────
  const compReceitas = useMemo(() => {
    const pix    = pedsMes.filter(p => p.forma_pagamento === 'pix').reduce((s, p) => s + Number(p.valor_total || 0), 0)
    const link   = pedsMes.filter(p => (p.forma_pagamento || '').startsWith('link')).reduce((s, p) => s + Number(p.valor_total || 0), 0)
    const cartao = pedsMes.filter(p => p.forma_pagamento === 'cartao').reduce((s, p) => s + Number(p.valor_total || 0), 0)
    const outros = pedsMes.filter(p => !['pix','cartao'].includes(p.forma_pagamento || '') && !(p.forma_pagamento || '').startsWith('link')).reduce((s, p) => s + Number(p.valor_total || 0), 0)
    const all = [
      { nome: 'Pix',               valor: pix,      cor: '#10b981' },
      { nome: 'Link de pagamento', valor: link,     cor: '#3b82f6' },
      { nome: 'Cartao',            valor: cartao,   cor: '#8b5cf6' },
      { nome: 'Outras vendas',     valor: outros,   cor: '#f59e0b' },
      { nome: 'Entradas manuais',  valor: entradasMes, cor: '#06b6d4' },
    ].filter(i => i.valor > 0).sort((a, b) => b.valor - a.valor)
    return { items: all, total: all.reduce((s, i) => s + i.valor, 0) }
  }, [pedsMes, entradasMes])

  const compDespesas = useMemo(() => {
    const all = [
      { nome: 'Compras de material',  valor: comprasValMes, cor: '#f59e0b' },
      { nome: 'Custos de producao',   valor: custoProdVal,  cor: '#ef4444' },
      { nome: 'Saidas manuais',       valor: saidasMes,     cor: '#8b5cf6' },
    ].filter(i => i.valor > 0).sort((a, b) => b.valor - a.valor)
    return { items: all, total: all.reduce((s, i) => s + i.valor, 0) }
  }, [comprasValMes, custoProdVal, saidasMes])

  // ── FLUXO DE CAIXA ───────────────────────────────────────────────────────
  const fluxoCaixa = useMemo(() => {
    const byDay: Record<string, { e: number; s: number }> = {}
    const add = (ds: string, tipo: 'e' | 's', val: number) => {
      const d = ds.split('T')[0]
      if (d < inicioStr || d > fimStr) return
      if (!byDay[d]) byDay[d] = { e: 0, s: 0 }
      byDay[d][tipo] += val
    }
    pedsMes.forEach(p    => add(p.created_at, 'e', Number(p.valor_total || 0)))
    finMes.forEach(f     => add(f.data, f.tipo === 'entrada' ? 'e' : 's', Number(f.valor || 0)))
    comprasMes.forEach(m => add(m.data, 's', Number(m.valor_pago || 0)))
    custProdMes.forEach(c => add(c.data, 's', Number(c.valor || 0)))
    let saldo = 0
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => {
      saldo += v.e - v.s
      return { dia: fmtDiaLabel(d), entradas: v.e, saidas: v.s, saldo }
    })
  }, [pedsMes, finMes, comprasMes, custProdMes, inicioStr, fimStr])

  // ── EVOLUÇÃO FINANCEIRA ───────────────────────────────────────────────────
  const evolucaoData = useMemo(() => {
    const venda = pedidos.filter(naoMimo)
    let rRows: { periodo: string; valor: number }[]
    let lRows: { periodo: string; valor: number }[]
    if (gran === 'dia') {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
      const v30 = venda.filter(p => new Date(p.created_at) >= cutoff)
      rRows = groupByDia(v30, 'created_at', 'valor_total').slice(-30)
      lRows = groupByDia(v30, 'created_at', 'lucro_real').slice(-30)
    } else if (gran === 'semana') {
      rRows = groupBySemana(venda, 'created_at', 'valor_total').slice(-12)
      lRows = groupBySemana(venda, 'created_at', 'lucro_real').slice(-12)
    } else {
      rRows = groupByMes(venda, 'created_at', 'valor_total').slice(-12)
      lRows = groupByMes(venda, 'created_at', 'lucro_real').slice(-12)
    }
    return rRows.map((r, i) => ({ periodo: r.periodo, receita: r.valor, lucro: lRows[i]?.valor ?? 0 }))
  }, [pedidos, gran])

  const lucroMensal = useMemo(() => groupByMes(pedidos.filter(naoMimo), 'created_at', 'lucro_real').slice(-12), [pedidos])
  const melhorMes   = lucroMensal.length > 0 ? [...lucroMensal].sort((a, b) => b.valor - a.valor)[0] : null
  const piorMes     = lucroMensal.length > 0 ? [...lucroMensal].sort((a, b) => a.valor - b.valor)[0] : null

  const margemMedia = useMemo(() => {
    const rM = groupByMes(pedidos.filter(naoMimo), 'created_at', 'valor_total').slice(-12)
    const lM = groupByMes(pedidos.filter(naoMimo), 'created_at', 'lucro_real').slice(-12)
    const vals = rM.map((r, i) => r.valor > 0 ? Math.round(((lM[i]?.valor ?? 0) / r.valor) * 100) : 0).filter(v => v > 0)
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0
  }, [pedidos])

  const diasNoMes   = new Date(ano, mes + 1, 0).getDate()
  const recDiaria   = diasNoMes > 0 ? receitaMes / diasNoMes : 0
  const lucroDiario = diasNoMes > 0 ? lucroMes / diasNoMes : 0
  const maiorVenda  = pedsMes.length > 0 ? Math.max(...pedsMes.map(p => Number(p.valor_total || 0))) : 0
  const recPorDia   = useMemo(() => groupByDia(pedsMes, 'created_at', 'valor_total'), [pedsMes])
  const melhorDia   = recPorDia.length > 0 ? [...recPorDia].sort((a, b) => b.valor - a.valor)[0] : null

  const insights = useMemo(() => {
    const list: { emoji: string; texto: string; tipo: 'ok' | 'neutro' | 'alerta' }[] = []
    const dRec = pct(receitaMes, receitaAnt)
    if (dRec !== null) {
      if (dRec > 0) list.push({ emoji: '📈', tipo: 'ok',    texto: `Receita aumentou ${dRec}% em relacao ao mes anterior.` })
      else if (dRec < 0) list.push({ emoji: '📉', tipo: 'alerta', texto: `Receita caiu ${Math.abs(dRec)}% em relacao ao mes anterior.` })
    }
    if (margem > 0) list.push({ emoji: '💰', tipo: 'ok', texto: `Margem de lucro esta em ${margem}% neste mes.` })
    if (custoProdVal > 0 && receitaMes > 0) {
      const p = Math.round((custoProdVal / receitaMes) * 100)
      list.push({ emoji: '🏭', tipo: p > 30 ? 'alerta' : 'neutro', texto: `Custos de producao representam ${p}% da receita.` })
    }
    const dCust = pct(custoProdVal, custoProdAntVal)
    if (dCust !== null && dCust > 15)
      list.push({ emoji: '⚠️', tipo: 'alerta', texto: `Custos de producao cresceram ${dCust}% em relacao ao mes anterior.` })
    if (comprasValMes > 0 && totalDesp > 0) {
      const p = Math.round((comprasValMes / totalDesp) * 100)
      list.push({ emoji: '📦', tipo: 'neutro', texto: `Compras de material representam ${p}% das despesas.` })
    }
    if (saldoConta < 0) list.push({ emoji: '🔴', tipo: 'alerta', texto: 'Saldo em conta negativo neste mes. Revise as despesas.' })
    else if (saldoConta > 0) list.push({ emoji: '✅', tipo: 'ok', texto: `Saldo positivo: ${formatCurrency(saldoConta)}.` })
    if (margemMedia > 0) list.push({ emoji: '📊', tipo: 'neutro', texto: `Margem media dos ultimos 12 meses: ${margemMedia}%.` })
    return list
  }, [receitaMes, receitaAnt, margem, custoProdVal, custoProdAntVal, comprasValMes, totalDesp, saldoConta, margemMedia])

  // ── GERAL: produtos / ranking ─────────────────────────────────────────────
  const porProduto = useMemo(() => {
    const pedSet = new Set(pedsMes.map(p => p.id))
    const map: Record<string, { qtd: number; fat: number }> = {}
    itens.filter(i => pedSet.has(i.pedido_id)).forEach(i => {
      const n = i.nome_produto || 'Outros'
      if (!map[n]) map[n] = { qtd: 0, fat: 0 }
      map[n].qtd += Number(i.quantidade || 0)
      map[n].fat += Number(i.subtotal   || 0)
    })
    return Object.entries(map).sort((a, b) => b[1].qtd - a[1].qtd)
  }, [pedsMes, itens])

  const kitMaisVendido = porProduto[0]
  const evolucaoGeral  = useMemo(() => groupByMes(pedidos.filter(naoMimo), 'created_at', 'valor_total').slice(-12), [pedidos])

  const pedsMesMap = useMemo(() => {
    const m: Record<string, number> = {}
    pedsMes.forEach(p => { if (p.cliente_id) m[p.cliente_id] = (m[p.cliente_id] || 0) + Number(p.valor_total || 0) })
    return m
  }, [pedsMes])

  const rankingFinal = useMemo(() => {
    const comMes = clientes.filter(c => pedsMesMap[c.id] !== undefined)
      .sort((a, b) => (pedsMesMap[b.id] || 0) - (pedsMesMap[a.id] || 0)).slice(0, 5)
    if (comMes.length > 0) return comMes
    return [...clientes].sort((a, b) => Number(b.total_gasto || 0) - Number(a.total_gasto || 0)).slice(0, 5)
  }, [clientes, pedsMesMap])

  // ── CLIENTES: CÁLCULOS ───────────────────────────────────────────────────

  // mapa de ultima compra por cliente_id
  const ultimaCompraMap = useMemo(() => {
    const m: Record<string, string> = {}
    pedidos.filter(naoMimo).forEach(p => {
      if (!p.cliente_id) return
      const ds = (p.created_at || '').split('T')[0]
      if (!m[p.cliente_id] || ds > m[p.cliente_id]) m[p.cliente_id] = ds
    })
    return m
  }, [pedidos])

  // clientes ativos (pedido nos ultimos 90 dias)
  const dataCorte90  = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0] }, [])
  const dataCorte180 = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 180); return d.toISOString().split('T')[0] }, [])
  const dataCorte365 = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toISOString().split('T')[0] }, [])

  const cliAtivos     = useMemo(() => clientes.filter(c => ultimaCompraMap[c.id] && ultimaCompraMap[c.id] >= dataCorte90), [clientes, ultimaCompraMap, dataCorte90])
  const cliNovosNoMes = useMemo(() => clientes.filter(c => {
    const d = new Date(c.created_at); return d.getFullYear() === ano && d.getMonth() === mes
  }), [clientes, ano, mes])
  const cliRecorrentes = useMemo(() => clientes.filter(c => Number(c.num_pedidos || 0) >= 2), [clientes])
  const ticketMedGeral = useMemo(() => {
    const totalGasto = clientes.reduce((s, c) => s + Number(c.total_gasto || 0), 0)
    const totalPeds  = clientes.reduce((s, c) => s + Number(c.num_pedidos || 0), 0)
    return totalPeds > 0 ? totalGasto / totalPeds : 0
  }, [clientes])

  // crescimento mensal — novos clientes por mes
  const crescimentoMensal = useMemo(() => {
    const map: Record<string, number> = {}
    clientes.forEach(c => {
      const ds = (c.created_at || '').split('T')[0]
      if (!ds || ds.length < 7) return
      const key = ds.slice(0, 7)
      map[key] = (map[key] || 0) + 1
    })
    const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
    // base acumulada
    const total = clientes.length
    let acum = total - entries.reduce((s, [, v]) => s + v, 0)
    return entries.map(([k, v]) => { acum += v; return { periodo: fmtMesLabel(k), novos: v, base: acum } })
  }, [clientes])

  // fidelizacao
  const fidel1   = useMemo(() => clientes.filter(c => Number(c.num_pedidos || 0) === 1).length, [clientes])
  const fidel2a5 = useMemo(() => clientes.filter(c => { const n = Number(c.num_pedidos || 0); return n >= 2 && n <= 5 }).length, [clientes])
  const fidelMais5 = useMemo(() => clientes.filter(c => Number(c.num_pedidos || 0) > 5).length, [clientes])
  const totalCli = clientes.length

  // ranking completo
  const rankingCompleto = useMemo(() => {
    return [...clientes]
      .filter(c => Number(c.num_pedidos || 0) > 0)
      .sort((a, b) => Number(b.total_gasto || 0) - Number(a.total_gasto || 0))
      .map(c => ({
        ...c,
        ticketMedCli: Number(c.num_pedidos || 0) > 0 ? Number(c.total_gasto || 0) / Number(c.num_pedidos || 0) : 0,
        ultimaCompra: ultimaCompraMap[c.id] || null,
      }))
  }, [clientes, ultimaCompraMap])

  // inativos
  const inativos90  = useMemo(() => clientes.filter(c => {
    const uc = ultimaCompraMap[c.id]
    return uc && uc < dataCorte90
  }).sort((a, b) => (ultimaCompraMap[b.id] || '') < (ultimaCompraMap[a.id] || '') ? -1 : 1), [clientes, ultimaCompraMap, dataCorte90])

  const inativos180 = useMemo(() => clientes.filter(c => {
    const uc = ultimaCompraMap[c.id]
    return uc && uc < dataCorte180
  }).sort((a, b) => (ultimaCompraMap[b.id] || '') < (ultimaCompraMap[a.id] || '') ? -1 : 1), [clientes, ultimaCompraMap, dataCorte180])

  const inativos365 = useMemo(() => clientes.filter(c => {
    const uc = ultimaCompraMap[c.id]
    return uc && uc < dataCorte365
  }), [clientes, ultimaCompraMap, dataCorte365])

  // distribuicao geografica
  const porCidade = useMemo(() => {
    const map: Record<string, number> = {}
    clientes.forEach(c => {
      const cidade = c.cidade || 'Nao informado'
      map[cidade] = (map[cidade] || 0) + 1
    })
    const total = clientes.length
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([nome, qtd]) => ({ nome, qtd, pct: total > 0 ? Math.round((qtd / total) * 100) : 0 }))
  }, [clientes])

  const porEstado = useMemo(() => {
    const map: Record<string, number> = {}
    clientes.forEach(c => {
      const estado = c.estado || 'N/I'
      map[estado] = (map[estado] || 0) + 1
    })
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 8)
      .map(([nome, qtd]) => ({ nome, qtd, pct: totalCli > 0 ? Math.round((qtd / totalCli) * 100) : 0 }))
  }, [clientes, totalCli])

  // ticket medio por mes
  const ticketMedMensal = useMemo(() => {
    const recM = groupByMes(pedidos.filter(naoMimo), 'created_at', 'valor_total').slice(-12)
    const cntM: Record<string, number> = {}
    pedidos.filter(naoMimo).forEach(p => {
      const ds = (p.created_at || '').split('T')[0]
      if (!ds || ds.length < 7) return
      const key = ds.slice(0, 7)
      cntM[key] = (cntM[key] || 0) + 1
    })
    return recM.map(r => {
      const key = Object.entries(cntM).find(([, ]) => fmtMesLabel(Object.keys(cntM).find(k => fmtMesLabel(k) === r.periodo) || '') === r.periodo)
      const cnt = Object.entries(cntM).find(([k]) => fmtMesLabel(k) === r.periodo)?.[1] || 1
      return { periodo: r.periodo, ticket: cnt > 0 ? Math.round(r.valor / cnt) : 0 }
    })
  }, [pedidos])

  // insights CRM
  const insightsCRM = useMemo(() => {
    const list: { emoji: string; texto: string; tipo: 'ok' | 'neutro' | 'alerta' }[] = []
    if (totalCli > 0) {
      const pctRec = Math.round((cliRecorrentes.length / totalCli) * 100)
      list.push({ emoji: '👥', tipo: 'ok', texto: `${pctRec}% dos clientes ja compraram mais de uma vez.` })
    }
    if (cliNovosNoMes.length > 0) list.push({ emoji: '🆕', tipo: 'ok', texto: `${cliNovosNoMes.length} novo(s) cliente(s) em ${MESES[mes]}.` })
    if (cliAtivos.length > 0 && totalCli > 0) {
      const pctAtivo = Math.round((cliAtivos.length / totalCli) * 100)
      list.push({ emoji: '🟢', tipo: 'neutro', texto: `${pctAtivo}% dos clientes estao ativos (compraram nos ultimos 90 dias).` })
    }
    const topCliente = rankingCompleto[0]
    if (topCliente) list.push({ emoji: '❤️', tipo: 'ok', texto: `${topCliente.nome} e o maior comprador da Reviva com ${formatCurrency(Number(topCliente.total_gasto || 0))}.` })
    if (inativos180.length > 0) list.push({ emoji: '⚠️', tipo: 'alerta', texto: `${inativos180.length} cliente(s) sem comprar ha mais de 180 dias.` })
    if (inativos90.length > 0) list.push({ emoji: '⏰', tipo: 'alerta', texto: `${inativos90.length} cliente(s) sem comprar ha mais de 90 dias.` })
    if (porCidade.length > 0 && totalCli > 0) {
      const top = porCidade[0]
      if (top.pct >= 20) list.push({ emoji: '🌎', tipo: 'neutro', texto: `${top.nome} concentra ${top.pct}% dos clientes (${top.qtd} clientes).` })
    }
    if (fidelMais5 > 0) list.push({ emoji: '⭐', tipo: 'ok', texto: `${fidelMais5} cliente(s) VIP com mais de 5 pedidos.` })
    if (fidel1 > 0 && totalCli > 0) {
      const p = Math.round((fidel1 / totalCli) * 100)
      list.push({ emoji: '💬', tipo: p > 50 ? 'alerta' : 'neutro', texto: `${p}% dos clientes fizeram apenas 1 pedido — potencial de retorno.` })
    }
    return list
  }, [totalCli, cliRecorrentes, cliNovosNoMes, mes, cliAtivos, rankingCompleto, inativos180, inativos90, porCidade, fidelMais5, fidel1])

  // oportunidades
  const oportunidades = useMemo(() => {
    const list: { emoji: string; titulo: string; desc: string; tipo: 'acao' | 'atencao' | 'vip' }[] = []
    if (inativos180.length > 0) list.push({ emoji: '💬', tipo: 'acao', titulo: `${inativos180.length} clientes inativos ha +180 dias`, desc: 'Entre em contato e reative esses clientes com uma oferta especial.' })
    if (fidel1 > 0) list.push({ emoji: '❤️', tipo: 'acao', titulo: `${fidel1} clientes com apenas 1 pedido`, desc: 'Envie uma campanha de retorno para quem ainda nao virou cliente fiel.' })
    const proximosVip = clientes.filter(c => { const n = Number(c.num_pedidos || 0); return n >= 4 && n <= 5 })
    if (proximosVip.length > 0) list.push({ emoji: '🎁', tipo: 'vip', titulo: `${proximosVip.length} clientes proximos de se tornarem VIP`, desc: 'Clientes com 4 a 5 pedidos. Um ultimo incentivo pode fideliza-los.' })
    const altoTicket = clientes.filter(c => Number(c.total_gasto || 0) > ticketMedGeral * 2 && Number(c.num_pedidos || 0) > 0)
    if (altoTicket.length > 0) list.push({ emoji: '⭐', tipo: 'vip', titulo: `${altoTicket.length} clientes com alto ticket medio`, desc: 'Clientes que gastam o dobro da media. Priorize o relacionamento com eles.' })
    if (cliNovosNoMes.length > 0) list.push({ emoji: '🆕', tipo: 'atencao', titulo: `${cliNovosNoMes.length} clientes novos em ${MESES[mes]}`, desc: 'Nao deixe o primeiro contato esfriar. Faca follow-up e encante.' })
    return list
  }, [inativos180, fidel1, clientes, ticketMedGeral, cliNovosNoMes, mes])

  // ── EXPORT CSV ────────────────────────────────────────────────────────────
  function exportarCSV() {
    const rows = [
      ['Data','Status','Tipo','Valor Total','Lucro Real','Forma Pagamento'],
      ...pedsMes.map(p => [
        new Date(p.created_at).toLocaleDateString('pt-BR'),
        p.status, p.tipo,
        Number(p.valor_total || 0).toFixed(2),
        Number(p.lucro_real  || 0).toFixed(2),
        p.forma_pagamento || '',
      ]),
    ]
    const blob = new Blob(['﻿' + rows.map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `bi-${MESES[mes]}-${ano}.csv`.toLowerCase(); a.click()
    URL.revokeObjectURL(url)
  }


  // ── ESTOQUE: CATEGORIAS ────────────────────────────────────────────────────
  const TIPOS_IMA_SET = new Set(['ima_magnetico','placa_plastico','placa_metal','plastico_protecao'])
  const catInsumo = (tipo: string) => TIPOS_IMA_SET.has(tipo) ? 'Imas' : tipo === 'folha_impressao' ? 'Impressao' : 'Embalagens'

  // ── ESTOQUE: MOV DO MÊS ──────────────────────────────────────────────────
  const movEstMes  = useMemo(() => movEstoque.filter(m => inDate(m.data, inicioStr, fimStr)), [movEstoque, inicioStr, fimStr])
  const consumoEst = useMemo(() => movEstMes.filter(m => m.tipo === 'saida'),   [movEstMes])
  const comprasEst = useMemo(() => movEstMes.filter(m => m.tipo === 'entrada'), [movEstMes])

  // total movimentacoes historico para giro/abc/reposicao
  const consumoTotal = useMemo(() => movEstoque.filter(m => m.tipo === 'saida'), [movEstoque])

  // ── CONSUMO POR MATERIAL (período) ────────────────────────────────────────
  const consumoPorMat = useMemo(() => {
    const map: Record<string, { nome: string; tipo: string; qtd: number }> = {}
    consumoEst.forEach(m => {
      const key  = m.insumo_id || m.insumos?.id || m.insumos?.nome || 'x'
      const nome = m.insumos?.nome || 'Desconhecido'
      const tipo = m.insumos?.tipo || ''
      if (!map[key]) map[key] = { nome, tipo, qtd: 0 }
      map[key].qtd += Number(m.quantidade || 0)
    })
    return Object.values(map).sort((a, b) => b.qtd - a.qtd)
  }, [consumoEst])

  // consumo total por material (histórico — para curva ABC)
  const consumoHistPorMat = useMemo(() => {
    const map: Record<string, { nome: string; tipo: string; qtd: number }> = {}
    consumoTotal.forEach(m => {
      const key  = m.insumo_id || m.insumos?.id || m.insumos?.nome || 'x'
      const nome = m.insumos?.nome || 'Desconhecido'
      const tipo = m.insumos?.tipo || ''
      if (!map[key]) map[key] = { nome, tipo, qtd: 0 }
      map[key].qtd += Number(m.quantidade || 0)
    })
    return Object.values(map).sort((a, b) => b.qtd - a.qtd)
  }, [consumoTotal])

  // ── INVESTIMENTO POR CATEGORIA ────────────────────────────────────────────
  const investPorCat = useMemo(() => {
    const map: Record<string, number> = {}
    comprasEst.forEach(m => {
      if (!m.valor_pago) return
      const cat = catInsumo(m.insumos?.tipo || '')
      map[cat] = (map[cat] || 0) + Number(m.valor_pago || 0)
    })
    const CORES: Record<string,string> = { Imas: '#b5005e', Embalagens: '#3b82f6', Impressao: '#f59e0b' }
    return Object.entries(map).sort(([,a],[,b])=>b-a).map(([cat,val])=>({ cat, val, cor: CORES[cat] || '#8b5cf6' }))
  }, [comprasEst])

  const investMensal = useMemo(() => {
    const map: Record<string, number> = {}
    movEstoque.filter(m => m.tipo === 'entrada' && m.valor_pago).forEach(m => {
      const ds = (m.data || '').split('T')[0]; if (!ds || ds.length < 7) return
      const key = ds.slice(0,7)
      map[key] = (map[key] || 0) + Number(m.valor_pago || 0)
    })
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).slice(-12)
      .map(([k,v]) => ({ periodo: fmtMesLabel(k), valor: v }))
  }, [movEstoque])

  // ── STATUS (crítico/baixo) ────────────────────────────────────────────────
  function calcStatusEst(ins: any): 'critico' | 'baixo' | 'normal' {
    const qtd = Number(ins.quantidade || 0)
    const min = Number(ins.estoque_minimo || 0)
    if (qtd === 0 || (min > 0 && qtd < min * 0.5)) return 'critico'
    if (min > 0 && qtd < min) return 'baixo'
    return 'normal'
  }

  const criticos = useMemo(() => insumos.filter(i => calcStatusEst(i) === 'critico'), [insumos])
  const baixos   = useMemo(() => insumos.filter(i => calcStatusEst(i) === 'baixo'),   [insumos])
  const valorEstTotal = useMemo(() => insumos.reduce((s,i) => s + Number(i.quantidade||0)*Number(i.custo_unitario||0), 0), [insumos])

  // ── CONSUMO POR PERÍODO ────────────────────────────────────────────────────
  const consumoMensal = useMemo(() => {
    const map: Record<string, number> = {}
    consumoTotal.forEach(m => {
      const ds = (m.data||'').split('T')[0]; if (!ds || ds.length < 7) return
      map[ds.slice(0,7)] = (map[ds.slice(0,7)] || 0) + Number(m.quantidade || 0)
    })
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).slice(-12)
      .map(([k,v]) => ({ periodo: fmtMesLabel(k), valor: v }))
  }, [consumoTotal])

  // ── GIRO ──────────────────────────────────────────────────────────────────
  const giroMateriais = useMemo(() => {
    const map: Record<string, { nome: string; saidas: number; entradas: number; ultimaData: string | null }> = {}
    movEstoque.forEach(m => {
      const key  = m.insumo_id || m.insumos?.nome || 'x'
      const nome = m.insumos?.nome || 'Desconhecido'
      if (!map[key]) map[key] = { nome, saidas: 0, entradas: 0, ultimaData: null }
      if (m.tipo === 'saida')   map[key].saidas   += Number(m.quantidade || 0)
      if (m.tipo === 'entrada') map[key].entradas += Number(m.quantidade || 0)
      if (!map[key].ultimaData || m.data > map[key].ultimaData!) map[key].ultimaData = m.data
    })
    return Object.values(map).sort((a,b)=>b.saidas-a.saidas)
  }, [movEstoque])

  // ── REPOSIÇÃO SUGERIDA ────────────────────────────────────────────────────
  const reposicaoSugerida = useMemo(() => {
    const d30 = new Date(); d30.setDate(d30.getDate()-30)
    const d30Str = d30.toISOString().split('T')[0]
    const ultimos30 = movEstoque.filter(m => m.tipo === 'saida' && m.data >= d30Str)
    const consMap: Record<string, number> = {}
    ultimos30.forEach(m => {
      const key = m.insumo_id || m.insumos?.id || ''
      if (!key) return
      consMap[key] = (consMap[key] || 0) + Number(m.quantidade || 0)
    })
    return insumos.map(ins => {
      const totalCons = consMap[ins.id] || 0
      if (totalCons <= 0) return null
      const diario = totalCons / 30
      const diasRest = Math.floor(Number(ins.quantidade || 0) / diario)
      return { nome: ins.nome, qtdAtual: Number(ins.quantidade||0), unidade: ins.unidade, diario: Math.round(diario*10)/10, diasRest, urgente: diasRest <= 15 }
    }).filter(Boolean).sort((a,b) => (a!.diasRest) - (b!.diasRest))
  }, [insumos, movEstoque])

  // ── CAPACIDADE DE PRODUÇÃO ────────────────────────────────────────────────
  const capacidadeProducao = useMemo(() => {
    const insumoMap: Record<string, any> = {}
    insumos.forEach(i => { insumoMap[i.tipo] = i })
    const sizes = tamanhoKits.length > 0 ? tamanhoKits : [6,12,18]
    return sizes.map(ktSize => {
      const consumo = calcularConsumo(ktSize, 12)
      let cap = Infinity; let limitante = ''
      for (const [tipo, qtdPorKit] of Object.entries(consumo)) {
        if ((qtdPorKit as number) <= 0) continue
        const disp = Number(insumoMap[tipo]?.quantidade || 0)
        const c = Math.floor(disp / (qtdPorKit as number))
        if (c < cap) { cap = c; limitante = insumoMap[tipo]?.nome || tipo }
      }
      return { nome: `Kit ${ktSize} imas`, capacidade: cap === Infinity ? 0 : cap, limitante }
    })
  }, [insumos, tamanhoKits])

  // ── CURVA ABC ────────────────────────────────────────────────────────────
  const curvaABC = useMemo(() => {
    const tot = consumoHistPorMat.reduce((s,i) => s+i.qtd, 0)
    let acum = 0
    return consumoHistPorMat.map(item => {
      acum += item.qtd
      const pctAcum = tot > 0 ? (acum/tot)*100 : 0
      const classe = pctAcum <= 80 ? 'A' : pctAcum <= 95 ? 'B' : 'C'
      return { ...item, pct: tot > 0 ? Math.round((item.qtd/tot)*100) : 0, pctAcum: Math.round(pctAcum), classe }
    })
  }, [consumoHistPorMat])

  const qtdA = curvaABC.filter(i=>i.classe==='A').length
  const qtdB = curvaABC.filter(i=>i.classe==='B').length
  const qtdC = curvaABC.filter(i=>i.classe==='C').length

  // ── INSIGHTS ESTOQUE ──────────────────────────────────────────────────────
  const insightsEstoque = useMemo(() => {
    const list: { emoji:string; texto:string; tipo:'ok'|'neutro'|'alerta' }[] = []
    if (criticos.length > 0) list.push({ emoji:'🔴', tipo:'alerta', texto:`${criticos.length} material(is) em estoque critico. Reposicao urgente necessaria.` })
    if (baixos.length > 0)   list.push({ emoji:'🟡', tipo:'alerta', texto:`${baixos.length} material(is) com estoque baixo.` })
    if (consumoPorMat.length > 0) {
      const top = consumoPorMat[0]
      const tot = consumoPorMat.reduce((s,m)=>s+m.qtd,0)
      const p   = tot > 0 ? Math.round((top.qtd/tot)*100) : 0
      list.push({ emoji:'📦', tipo:'neutro', texto:`${top.nome} representa ${p}% do consumo total no periodo.` })
    }
    const urg = reposicaoSugerida.filter(r=>r && r.diasRest<=10)
    urg.slice(0,3).forEach(r=>{ if(r) list.push({ emoji:'⚠️', tipo:'alerta', texto:`O estoque de ${r.nome} deve acabar em aproximadamente ${r.diasRest} dias.` }) })
    const invMes = comprasEst.reduce((s,m)=>s+Number(m.valor_pago||0),0)
    const invAntMes = movEstoque.filter(m=>m.tipo==='entrada'&&m.valor_pago&&inDate(m.data,inicioAntStr,fimAntStr)).reduce((s,m)=>s+Number(m.valor_pago||0),0)
    const dInv = pct(invMes, invAntMes)
    if (dInv !== null && dInv !== 0) list.push({ emoji:'💰', tipo: dInv>0?'alerta':'ok', texto:`O investimento em estoque ${dInv>0?`aumentou ${dInv}%`:`reduziu ${Math.abs(dInv)}%`} em relacao ao mes anterior.` })
    if (qtdA > 0) list.push({ emoji:'📊', tipo:'neutro', texto:`${qtdA} material(is) classificado(s) como Classe A (maior consumo historico).` })
    if (criticos.length===0 && baixos.length===0) list.push({ emoji:'🟢', tipo:'ok', texto:'Nenhum material em estado critico ou baixo no momento.' })
    return list
  }, [criticos, baixos, consumoPorMat, reposicaoSugerida, comprasEst, movEstoque, inicioAntStr, fimAntStr, qtdA])

  // ── EXPORT ESTOQUE ────────────────────────────────────────────────────────
  function exportarCSVEstoque() {
    const rows = [
      ['Material','Estoque Atual','Unidade','Status','Custo Unit.','Valor em Estoque'],
      ...insumos.map(i => [
        i.nome,
        String(Number(i.quantidade||0).toFixed(1)),
        i.unidade||'',
        calcStatusEst(i),
        String(Number(i.custo_unitario||0).toFixed(2)),
        String((Number(i.quantidade||0)*Number(i.custo_unitario||0)).toFixed(2)),
      ])
    ]
    const blob = new Blob(['﻿'+rows.map(r=>r.join(';')).join('\n')],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a')
    a.href=url;a.download=`estoque-bi-${MESES[mes]}-${ano}.csv`.toLowerCase();a.click()
    URL.revokeObjectURL(url)
  }

  async function exportarPDFEstoque() {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    doc.setFontSize(16); doc.setTextColor(181,0,94)
    doc.text('Relatorio de Estoque — Reviva Imas', 14, 18)
    doc.setFontSize(10); doc.setTextColor(100,100,100)
    doc.text(`Periodo: ${MESES[mes]} ${ano}`, 14, 26)
    doc.text(`Total de insumos: ${insumos.length}  |  Criticos: ${criticos.length}  |  Baixos: ${baixos.length}`, 14, 33)
    doc.text(`Valor total em estoque: R$ ${valorEstTotal.toFixed(2).replace('.',',')}`, 14, 40)
    let y = 52
    doc.setFontSize(11); doc.setTextColor(30,30,30)
    doc.text('Material', 14, y); doc.text('Qtd', 80, y); doc.text('Status', 110, y); doc.text('Valor', 155, y)
    doc.setDrawColor(200,200,200); doc.line(14, y+2, 196, y+2); y += 8
    doc.setFontSize(9)
    insumos.forEach(i => {
      if (y > 270) { doc.addPage(); y = 20 }
      const st = calcStatusEst(i)
      doc.setTextColor(st==='critico'?[200,0,0]:st==='baixo'?[180,130,0]:[40,40,40] as any)
      doc.text((i.nome||'').slice(0,35), 14, y)
      doc.setTextColor(40,40,40)
      doc.text(`${Number(i.quantidade||0).toFixed(1)} ${i.unidade||''}`, 80, y)
      doc.text(st, 110, y)
      doc.text(`R$ ${(Number(i.quantidade||0)*Number(i.custo_unitario||0)).toFixed(2).replace('.',',')}`, 155, y)
      y += 7
    })
    doc.save(`estoque-bi-${MESES[mes]}-${ano}.pdf`.toLowerCase())
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#b5005e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const maxQtd = porProduto.length > 0 ? porProduto[0][1].qtd : 1

  function ComposicaoBar({ items, total }: { items: { nome: string; valor: number; cor: string }[]; total: number }) {
    return (
      <div className="space-y-3">
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {items.map(i => (
            <div key={i.nome} style={{ width: `${(i.valor / total) * 100}%`, backgroundColor: i.cor }} />
          ))}
        </div>
        {items.map(i => {
          const p = Math.round((i.valor / total) * 100)
          return (
            <div key={i.nome}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: i.cor }} />
                  <span className="text-xs font-semibold text-gray-700">{i.nome}</span>
                </div>
                <span className="text-xs text-gray-500">{formatCurrency(i.valor)} · {p}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${p}%`, backgroundColor: i.cor }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // sub-abas clientes
  const SUB_ABAS_CLI: { id: SubCli; label: string }[] = [
    { id: 'visao',        label: '👥 Geral' },
    { id: 'crescimento',  label: '📈 Crescimento' },
    { id: 'fidelizacao',  label: '❤️ Fidelizacao' },
    { id: 'ranking',      label: '🏆 Ranking' },
    { id: 'inativos',     label: '😴 Inativos' },
    { id: 'localizacao',  label: '🌎 Localizacao' },
    { id: 'ticket',       label: '🎯 Ticket' },
    { id: 'insights',     label: '💡 Insights' },
    { id: 'oportunidades',label: '🚀 Oportunidades' },
  ]

  return (
    <div className="pb-28">

      {/* HEADER */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">📊 BI Reviva</h1>
        <button onClick={exportarCSV}
          className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-all">
          <Download size={13} /> Excel
        </button>
      </div>

      {/* SELETOR DE MÊS */}
      <div className="px-4 mb-4 relative z-20">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm active:scale-[0.98] transition-all">
          {MESES[mes]} {ano}
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-4 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden w-52 max-h-72 overflow-y-auto">
            {[ano - 1, ano].flatMap(y =>
              MESES.map((nm, idx) => {
                const futuro = y > hoje.getFullYear() || (y === hoje.getFullYear() && idx > hoje.getMonth())
                if (futuro) return null
                const sel = y === ano && idx === mes
                return (
                  <button key={`${y}-${idx}`} onClick={() => { setAno(y); setMes(idx); setOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sel ? 'bg-[#b5005e] text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                    {nm} {y}
                  </button>
                )
              })
            )}
          </div>
        </>}
      </div>

      {/* ABAS PRINCIPAIS */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([['geral','📊 Geral'],['fin','💰 Fin.'],['cli','👥 Cli.'],['est','📦 Est.']] as [Aba,string][]).map(([id,label]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all ${aba === id ? 'bg-white text-[#b5005e] shadow-sm' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">

        {/* ══ ABA: VISÃO GERAL ═══════════════════════════════════════════════ */}
        {aba === 'geral' && <>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white">
              <p className="text-xs text-pink-200 mb-0.5">💰 Receita</p>
              <p className="text-2xl font-bold">{formatCurrency(receitaMes)}</p>
              {receitaAnt > 0 && <span className={`flex items-center gap-0.5 text-xs font-semibold mt-1 ${receitaMes >= receitaAnt ? 'text-green-300' : 'text-red-300'}`}>
                {receitaMes >= receitaAnt ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(pct(receitaMes,receitaAnt) ?? 0)}% vs ant.
              </span>}
            </div>
            <div className={`rounded-2xl p-4 text-white ${lucroMes >= 0 ? 'bg-gradient-to-br from-green-600 to-emerald-700' : 'bg-gradient-to-br from-red-500 to-red-700'}`}>
              <p className="text-xs text-green-200 mb-0.5">💵 Lucro</p>
              <p className="text-2xl font-bold">{formatCurrency(lucroMes)}</p>
              {lucroAnt !== 0 && <span className={`flex items-center gap-0.5 text-xs font-semibold mt-1 ${lucroMes >= lucroAnt ? 'text-green-300' : 'text-red-300'}`}>
                {lucroMes >= lucroAnt ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(pct(lucroMes,lucroAnt) ?? 0)}% vs ant.
              </span>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-0.5">📦 Pedidos</p>
              <p className="text-3xl font-bold text-gray-900">{qtdPeds}</p>
              {deltaEl(qtdPeds, pedsAnt.length)}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-0.5">👥 Clientes</p>
              <p className="text-3xl font-bold text-gray-900">{clientes.length}</p>
              {cliNovosNoMes.length > 0 && <span className="text-xs text-green-600 font-semibold">+{cliNovosNoMes.length} novos</span>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-0.5">🎯 Ticket Medio</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(ticketMed)}</p>
            </div>
            <div className="bg-pink-50 rounded-2xl border border-pink-200 shadow-sm p-4">
              <div className="flex items-center gap-1 mb-0.5">
                <Heart size={12} className="text-[#b5005e]" />
                <p className="text-xs text-[#b5005e] font-medium">Kit mais vendido</p>
              </div>
              {kitMaisVendido ? (<>
                <p className="text-sm font-bold text-gray-900 truncate">{kitMaisVendido[0]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{kitMaisVendido[1].qtd} venda{kitMaisVendido[1].qtd !== 1 ? 's' : ''}</p>
              </>) : <p className="text-xs text-gray-400 mt-1">Sem dados</p>}
            </div>
          </div>

          {evolucaoGeral.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-[#b5005e]" />
                <p className="text-sm font-bold text-gray-800">Evolucao mensal</p>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={evolucaoGeral}>
                  <defs>
                    <linearGradient id="gEvG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#b5005e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#b5005e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={44} />
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Receita']} />
                  <Area type="monotone" dataKey="valor" stroke="#b5005e" fill="url(#gEvG)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {porProduto.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">📦 Produtos</p>
              <div className="space-y-3">
                {porProduto.map(([nome, info], i) => (
                  <div key={nome}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 truncate max-w-[55%]">{nome}</span>
                      <span className="text-xs text-gray-500">{info.qtd}x · {formatCurrency(info.fat)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${(info.qtd/maxQtd)*100}%`, backgroundColor: ['#b5005e','#10b981','#3b82f6','#f59e0b'][i] || '#8b5cf6' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">
              👥 {Object.keys(pedsMesMap).length > 0 ? 'Clientes que mais compraram' : 'Top clientes (geral)'}
            </p>
            {rankingFinal.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sem dados</p>
            ) : (
              <div className="space-y-0.5">
                {rankingFinal.map((c, i) => {
                  const val   = pedsMesMap[c.id] || Number(c.total_gasto || 0)
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}°`
                  return (
                    <Link key={c.id} href={`/clientes/${c.id}`}
                      className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 active:opacity-60">
                      <span className="text-base w-7 text-center">{medal}</span>
                      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-[#b5005e]">{(c.nome||'?').slice(0,2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                        <p className="text-xs text-gray-400">{Number(c.num_pedidos||0)} pedido(s)</p>
                      </div>
                      <p className="text-sm font-bold text-green-700">{formatCurrency(val)}</p>
                      <ChevronRight size={14} className="text-gray-300" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-0.5">📊 Margem</p>
              <p className="text-3xl font-bold text-gray-900">{margem}%</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-0.5">🏭 Imas vendidos</p>
              <p className="text-3xl font-bold text-gray-900">{pedsMes.reduce((s,p) => s + Number(p.qtd_imas||0), 0)}</p>
            </div>
          </div>

          {pedsMes.length === 0 && (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-semibold text-gray-600">Nenhum pedido em {MESES[mes]}</p>
            </div>
          )}
        </>}

        {/* ══ ABA: FINANCEIRO ════════════════════════════════════════════════ */}
        {aba === 'fin' && <>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">💰 Indicadores</p>

          <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white">
            <p className="text-xs text-pink-200 mb-0.5">Saldo em Conta</p>
            <p className="text-3xl font-bold">{formatCurrency(saldoConta)}</p>
            {saldoAnt !== 0 && <span className={`flex items-center gap-0.5 text-xs font-semibold mt-1 ${saldoConta >= saldoAnt ? 'text-green-300' : 'text-red-300'}`}>
              {saldoConta >= saldoAnt ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}{Math.abs(pct(saldoConta,saldoAnt) ?? 0)}% vs mes ant.
            </span>}
            <p className="text-[10px] text-pink-200 mt-1.5">receita + entradas - saidas - material - producao</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-green-50 rounded-2xl border border-green-200 shadow-sm p-4">
              <p className="text-xs text-green-600 mb-0.5">📈 Receita</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(receitaMes)}</p>
              {deltaEl(receitaMes, receitaAnt)}
            </div>
            <div className={`rounded-2xl border shadow-sm p-4 ${lucroMes >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs text-gray-500 mb-0.5">💵 Lucro</p>
              <p className={`text-xl font-bold ${lucroMes >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(lucroMes)}</p>
              {deltaEl(lucroMes, lucroAnt)}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-400 mb-0.5">📊 Margem</p>
              <p className="text-2xl font-bold text-gray-900">{margem}%</p>
              {margemAnt > 0 && <span className={`text-xs font-semibold ${margem >= margemAnt ? 'text-green-600' : 'text-red-500'}`}>
                {margem >= margemAnt ? '▲' : '▼'} {Math.abs(margem - margemAnt)}pp vs ant.
              </span>}
            </div>
            <div className="bg-orange-50 rounded-2xl border border-orange-200 shadow-sm p-4">
              <p className="text-xs text-orange-600 mb-0.5">💸 Despesas</p>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(totalDesp)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">📈 Evolucao</p>
            <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
              {(['mes','semana','dia'] as Gran[]).map(g => (
                <button key={g} onClick={() => setGran(g)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${gran === g ? 'bg-white text-[#b5005e] shadow-sm' : 'text-gray-500'}`}>
                  {g === 'mes' ? 'Mes' : g === 'semana' ? 'Sem' : 'Dia'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex gap-4 mb-3">
              <span className="flex items-center gap-1 text-xs text-[#b5005e] font-semibold"><span className="w-3 h-1 bg-[#b5005e] rounded-full inline-block" /> Receita</span>
              <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><span className="w-3 h-1 bg-green-500 rounded-full inline-block" /> Lucro</span>
            </div>
            {evolucaoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={evolucaoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={44} />
                  <Tooltip formatter={(v: any, name: any) => [formatCurrency(Number(v)), name === 'receita' ? 'Receita' : 'Lucro']} />
                  <Line type="monotone" dataKey="receita" stroke="#b5005e" strokeWidth={2.5} dot={false} name="receita" />
                  <Line type="monotone" dataKey="lucro"   stroke="#10b981" strokeWidth={2}   dot={false} name="lucro" />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-8">Sem dados suficientes</p>}
          </div>

          {compReceitas.total > 0 && <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">🥧 Composicao das Receitas</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(compReceitas.total)}</p>
              </div>
              <ComposicaoBar items={compReceitas.items} total={compReceitas.total} />
            </div>
          </>}

          {compDespesas.total > 0 && <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">🥧 Composicao das Despesas</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-sm font-bold text-orange-600">{formatCurrency(compDespesas.total)}</p>
              </div>
              <ComposicaoBar items={compDespesas.items} total={compDespesas.total} />
            </div>
          </>}

          {fluxoCaixa.length > 0 && <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">📊 Fluxo de Caixa — {MESES[mes]}</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-wrap gap-3 mb-3">
                <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><span className="w-2.5 h-2.5 bg-green-500 rounded-sm inline-block" /> Entradas</span>
                <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold"><span className="w-2.5 h-2.5 bg-orange-400 rounded-sm inline-block" /> Saidas</span>
                <span className="flex items-center gap-1 text-xs text-[#b5005e] font-semibold"><span className="w-4 h-0.5 bg-[#b5005e] inline-block" /> Saldo</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={fluxoCaixa}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="dia" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={44} />
                  <Tooltip formatter={(v: any, name: any) => [formatCurrency(Number(v)), name === 'entradas' ? 'Entradas' : name === 'saidas' ? 'Saidas' : 'Saldo']} />
                  <Line type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={1.5} dot={false} name="entradas" />
                  <Line type="monotone" dataKey="saidas"   stroke="#f59e0b" strokeWidth={1.5} dot={false} name="saidas" />
                  <Line type="monotone" dataKey="saldo"    stroke="#b5005e" strokeWidth={2.5} dot={false} name="saldo" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>}

          {lucroMensal.length > 0 && <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">📊 Evolucao do Lucro</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">Margem media</p>
                  <p className="text-base font-bold text-gray-900">{margemMedia}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-green-500">Melhor mes</p>
                  <p className="text-xs font-bold text-green-700">{melhorMes?.periodo ?? '-'}</p>
                  <p className="text-[10px] text-green-600">{melhorMes ? formatCurrency(melhorMes.valor) : ''}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-red-400">Pior mes</p>
                  <p className="text-xs font-bold text-red-600">{piorMes?.periodo ?? '-'}</p>
                  <p className="text-[10px] text-red-500">{piorMes ? formatCurrency(piorMes.valor) : ''}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={lucroMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} width={44} />
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Lucro']} />
                  <Bar dataKey="valor" fill="#10b981" radius={[4,4,0,0]} name="Lucro" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>}

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">📋 Indicadores Adicionais</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
              <p className="text-[10px] text-gray-400">Ticket medio</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(ticketMed)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
              <p className="text-[10px] text-gray-400">Receita diaria media</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(recDiaria)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
              <p className="text-[10px] text-gray-400">Lucro diario medio</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(lucroDiario)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
              <p className="text-[10px] text-gray-400">Maior venda do mes</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(maiorVenda)}</p>
            </div>
            <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
              <p className="text-[10px] text-gray-400">Melhor dia de vendas</p>
              {melhorDia ? (
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-sm font-bold text-gray-900">{melhorDia.periodo}</p>
                  <p className="text-sm font-bold text-green-700">{formatCurrency(melhorDia.valor)}</p>
                </div>
              ) : <p className="text-sm text-gray-400 mt-0.5">Sem vendas no mes</p>}
            </div>
          </div>

          {insights.length > 0 && <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">💡 Insights Financeiros</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-yellow-500" />
                <p className="text-sm font-bold text-gray-800">Analise Automatica</p>
              </div>
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${
                    ins.tipo === 'ok' ? 'bg-green-50 text-green-800' : ins.tipo === 'alerta' ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-700'
                  }`}>
                    <span className="flex-shrink-0">{ins.emoji}</span>
                    <span>{ins.texto}</span>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {pedsMes.length === 0 && compReceitas.total === 0 && compDespesas.total === 0 && (
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm font-semibold text-gray-600">Nenhum dado em {MESES[mes]}</p>
              <p className="text-xs text-gray-400 mt-1">Selecione outro mes ou aguarde novos registros</p>
            </div>
          )}
        </>}

        {/* ══ ABA: CLIENTES ══════════════════════════════════════════════════ */}
        {aba === 'cli' && <>
          {/* Sub-nav */}
          <div className="overflow-x-auto -mx-4 px-4 pb-1">
            <div className="flex gap-1.5 min-w-max">
              {SUB_ABAS_CLI.map(({ id, label }) => (
                <button key={id} onClick={() => setSubAbaCli(id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    subAbaCli === id ? 'bg-[#b5005e] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 1. VISÃO GERAL ─────────────────────────────────────────────── */}
          {subAbaCli === 'visao' && <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white col-span-2">
                <p className="text-xs text-pink-200 mb-0.5">👥 Total de Clientes</p>
                <p className="text-4xl font-bold">{totalCli}</p>
                {cliNovosNoMes.length > 0 && <span className="text-xs text-pink-200">+{cliNovosNoMes.length} em {MESES[mes]}</span>}
              </div>
              <div className="bg-green-50 rounded-2xl border border-green-200 shadow-sm p-4">
                <p className="text-xs text-green-600 mb-0.5">🟢 Ativos</p>
                <p className="text-2xl font-bold text-green-700">{cliAtivos.length}</p>
                <p className="text-[10px] text-green-500 mt-0.5">ultimos 90 dias</p>
              </div>
              <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-4">
                <p className="text-xs text-blue-600 mb-0.5">🆕 Novos no mes</p>
                <p className="text-2xl font-bold text-blue-700">{cliNovosNoMes.length}</p>
                <p className="text-[10px] text-blue-400 mt-0.5">{MESES[mes]} {ano}</p>
              </div>
              <div className="bg-pink-50 rounded-2xl border border-pink-200 shadow-sm p-4">
                <p className="text-xs text-[#b5005e] mb-0.5">❤️ Recorrentes</p>
                <p className="text-2xl font-bold text-[#b5005e]">{cliRecorrentes.length}</p>
                <p className="text-[10px] text-pink-400 mt-0.5">2 ou mais pedidos</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-0.5">🎯 Ticket Medio Geral</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(ticketMedGeral)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-0.5">📦 Total de Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{pedidos.filter(naoMimo).length}</p>
              </div>
              <div className="bg-orange-50 rounded-2xl border border-orange-200 shadow-sm p-4">
                <p className="text-xs text-orange-500 mb-0.5">😴 Inativos +90d</p>
                <p className="text-2xl font-bold text-orange-600">{inativos90.length}</p>
              </div>
            </div>
          </>}

          {/* ── 2. CRESCIMENTO ──────────────────────────────────────────────── */}
          {subAbaCli === 'crescimento' && <>
            {crescimentoMensal.length > 0 ? (<>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-800 mb-1">📈 Novos clientes por mes</p>
                <p className="text-xs text-gray-400 mb-3">Ultimos 12 meses</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={crescimentoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} width={28} />
                    <Tooltip formatter={(v: any, name: any) => [v, name === 'novos' ? 'Novos clientes' : 'Base total']} />
                    <Bar dataKey="novos" fill="#b5005e" radius={[4,4,0,0]} name="novos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-800 mb-1">📊 Evolucao da base</p>
                <p className="text-xs text-gray-400 mb-3">Total acumulado de clientes</p>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={crescimentoMensal}>
                    <defs>
                      <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} width={32} />
                    <Tooltip formatter={(v: any) => [v, 'Clientes']} />
                    <Area type="monotone" dataKey="base" stroke="#3b82f6" fill="url(#gBase)" strokeWidth={2.5} dot={false} name="Base" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <p className="text-[10px] text-gray-400">Total</p>
                  <p className="text-xl font-bold text-gray-900">{totalCli}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <p className="text-[10px] text-gray-400">Este mes</p>
                  <p className="text-xl font-bold text-[#b5005e]">{cliNovosNoMes.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <p className="text-[10px] text-gray-400">Media/mes</p>
                  <p className="text-xl font-bold text-gray-900">
                    {crescimentoMensal.length > 0 ? Math.round(crescimentoMensal.reduce((s, r) => s + r.novos, 0) / crescimentoMensal.length) : 0}
                  </p>
                </div>
              </div>
            </>) : (
              <div className="bg-gray-50 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-sm text-gray-500">Sem dados de crescimento</p>
              </div>
            )}
          </>}

          {/* ── 3. FIDELIZAÇÃO ──────────────────────────────────────────────── */}
          {subAbaCli === 'fidelizacao' && <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-bold text-gray-800 mb-4">❤️ Segmentacao por fidelidade</p>
              <div className="space-y-4">
                {[
                  { label: '1 pedido', qtd: fidel1, cor: '#f59e0b', emoji: '🆕', desc: 'Clientes que compraram so uma vez' },
                  { label: '2 a 5 pedidos', qtd: fidel2a5, cor: '#3b82f6', emoji: '🔄', desc: 'Clientes em processo de fidelizacao' },
                  { label: 'Mais de 5 pedidos', qtd: fidelMais5, cor: '#b5005e', emoji: '⭐', desc: 'Clientes VIP — mais de 5 compras' },
                ].map(row => {
                  const p = totalCli > 0 ? Math.round((row.qtd / totalCli) * 100) : 0
                  return (
                    <div key={row.label}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base">{row.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-800">{row.label}</p>
                            <p className="text-xs font-bold text-gray-900">{row.qtd} clientes · {p}%</p>
                          </div>
                          <p className="text-[10px] text-gray-400">{row.desc}</p>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-3 rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: row.cor }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-yellow-50 rounded-2xl border border-yellow-200 shadow-sm p-3 text-center">
                <p className="text-2xl mb-1">🆕</p>
                <p className="text-xl font-bold text-yellow-700">{fidel1}</p>
                <p className="text-[10px] text-yellow-600">1 pedido</p>
              </div>
              <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-3 text-center">
                <p className="text-2xl mb-1">🔄</p>
                <p className="text-xl font-bold text-blue-700">{fidel2a5}</p>
                <p className="text-[10px] text-blue-600">2 a 5 pedidos</p>
              </div>
              <div className="bg-pink-50 rounded-2xl border border-pink-200 shadow-sm p-3 text-center">
                <p className="text-2xl mb-1">⭐</p>
                <p className="text-xl font-bold text-[#b5005e]">{fidelMais5}</p>
                <p className="text-[10px] text-pink-600">VIP (+5)</p>
              </div>
            </div>

            {totalCli > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                  {fidel1 > 0 && <div style={{ width: `${Math.round(fidel1/totalCli*100)}%`, backgroundColor: '#f59e0b' }} title={`1 pedido: ${fidel1}`} />}
                  {fidel2a5 > 0 && <div style={{ width: `${Math.round(fidel2a5/totalCli*100)}%`, backgroundColor: '#3b82f6' }} title={`2-5 pedidos: ${fidel2a5}`} />}
                  {fidelMais5 > 0 && <div style={{ width: `${Math.round(fidelMais5/totalCli*100)}%`, backgroundColor: '#b5005e' }} title={`+5 pedidos: ${fidelMais5}`} />}
                </div>
                <div className="flex gap-4 mt-3 flex-wrap">
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> 1 pedido</span>
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> 2-5 pedidos</span>
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-full bg-[#b5005e] inline-block" /> VIP</span>
                </div>
              </div>
            )}
          </>}

          {/* ── 4. RANKING ──────────────────────────────────────────────────── */}
          {subAbaCli === 'ranking' && <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-sm font-bold text-gray-800">🏆 Ranking de Clientes</p>
                <p className="text-xs text-gray-400">Por total gasto — todos os periodos</p>
              </div>
              {rankingCompleto.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum cliente com pedidos</p>
              ) : (
                <div>
                  {rankingCompleto.map((c, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                    return (
                      <div key={c.id} className="border-t border-gray-50 first:border-0">
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="text-base w-7 text-center flex-shrink-0">
                            {medal || <span className="text-xs text-gray-400 font-bold">{i+1}</span>}
                          </span>
                          <div className="w-9 h-9 rounded-full bg-pink-100 flex-shrink-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-[#b5005e]">{(c.nome||'?').slice(0,2).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {c.cidade && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MapPin size={9}/>{c.cidade}</span>}
                              <span className="text-[10px] text-gray-400">{Number(c.num_pedidos||0)} ped.</span>
                              <span className="text-[10px] text-gray-400">TM: {formatCurrency(c.ticketMedCli)}</span>
                              {c.ultimaCompra && <span className="text-[10px] text-gray-400">Ult: {fmtData(c.ultimaCompra)}</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-green-700">{formatCurrency(Number(c.total_gasto||0))}</p>
                            <Link href={`/clientes/${c.id}`} className="text-[10px] text-[#b5005e] font-semibold">ver perfil →</Link>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>}

          {/* ── 5. INATIVOS ─────────────────────────────────────────────────── */}
          {subAbaCli === 'inativos' && <>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-3 text-center">
                <p className="text-xl font-bold text-yellow-700">{inativos90.length}</p>
                <p className="text-[10px] text-yellow-600">+90 dias</p>
              </div>
              <div className="bg-orange-50 rounded-2xl border border-orange-200 p-3 text-center">
                <p className="text-xl font-bold text-orange-700">{inativos180.length}</p>
                <p className="text-[10px] text-orange-600">+180 dias</p>
              </div>
              <div className="bg-red-50 rounded-2xl border border-red-200 p-3 text-center">
                <p className="text-xl font-bold text-red-700">{inativos365.length}</p>
                <p className="text-[10px] text-red-600">+365 dias</p>
              </div>
            </div>

            {inativos90.length === 0 ? (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-sm font-semibold text-green-700">Nenhum cliente inativo!</p>
                <p className="text-xs text-green-500 mt-1">Todos compraram nos ultimos 90 dias</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-800">😴 Clientes sem comprar ha mais de 90 dias</p>
                </div>
                {inativos90.slice(0, 20).map(c => {
                  const uc = ultimaCompraMap[c.id]
                  const dias = uc ? diasAtras(uc) : null
                  const wpp = c.whatsapp ? c.whatsapp.replace(/\D/g, '') : null
                  const msg = `Oi ${(c.nome||'').split(' ')[0]}! Sentimos sua falta na Reviva Imas. Que tal conferir nossas novidades?`
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-0">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex-shrink-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-600">{(c.nome||'?').slice(0,2).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.nome}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {uc && <span className="text-[10px] text-gray-400">Ultima: {fmtData(uc)}</span>}
                          {dias !== null && <span className={`text-[10px] font-semibold ${dias > 180 ? 'text-red-500' : 'text-orange-500'}`}>{dias}d atras</span>}
                          <span className="text-[10px] text-gray-400">{formatCurrency(Number(c.total_gasto||0))}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link href={`/clientes/${c.id}`} className="text-[10px] text-[#b5005e] font-semibold">perfil</Link>
                        {wpp && (
                          <a href={`https://wa.me/55${wpp}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                            <MessageCircle size={10} /> Zap
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>}

          {/* ── 6. LOCALIZAÇÃO ──────────────────────────────────────────────── */}
          {subAbaCli === 'localizacao' && <>
            {porCidade.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">🌎</p>
                <p className="text-sm text-gray-500">Nenhum cliente com cidade cadastrada</p>
                <p className="text-xs text-gray-400 mt-1">Cadastre as cidades no perfil dos clientes</p>
              </div>
            ) : (<>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-800 mb-4">🏙 Distribuicao por Cidade</p>
                <div className="space-y-3">
                  {porCidade.map((c, i) => (
                    <div key={c.nome}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-semibold text-gray-800 truncate max-w-[60%]">{c.nome}</span>
                        </div>
                        <span className="text-xs text-gray-500">{c.qtd} cliente{c.qtd !== 1 ? 's' : ''} · {c.pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-2.5 rounded-full" style={{
                          width: `${c.pct}%`,
                          backgroundColor: ['#b5005e','#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ef4444','#ec4899','#84cc16','#f97316'][i] || '#94a3b8'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {porEstado.length > 1 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-sm font-bold text-gray-800 mb-3">🗺 Por Estado</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={porEstado} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9 }} />
                      <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={36} />
                      <Tooltip formatter={(v: any) => [v, 'Clientes']} />
                      <Bar dataKey="qtd" fill="#b5005e" radius={[0,4,4,0]} name="Clientes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <p className="text-[10px] text-gray-400">Cidade principal</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{porCidade[0]?.nome}</p>
                  <p className="text-xs text-[#b5005e] font-bold">{porCidade[0]?.pct}%</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <p className="text-[10px] text-gray-400">Cidades atendidas</p>
                  <p className="text-2xl font-bold text-gray-900">{porCidade.length}</p>
                </div>
              </div>
            </>)}
          </>}

          {/* ── 7. TICKET MÉDIO ─────────────────────────────────────────────── */}
          {subAbaCli === 'ticket' && <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white col-span-2">
                <p className="text-xs text-pink-200 mb-0.5">🎯 Ticket Medio Geral</p>
                <p className="text-3xl font-bold">{formatCurrency(ticketMedGeral)}</p>
                <p className="text-[10px] text-pink-200 mt-1">media de todos os clientes e pedidos</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-0.5">Ticket do mes</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(ticketMed)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-0.5">Total faturado</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(clientes.reduce((s, c) => s + Number(c.total_gasto || 0), 0))}</p>
              </div>
            </div>

            {ticketMedMensal.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-800 mb-1">📈 Evolucao do Ticket Medio</p>
                <p className="text-xs text-gray-400 mb-3">Por mes — ultimos 12 meses</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={ticketMedMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `R$${v}`} width={52} />
                    <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Ticket Medio']} />
                    <Line type="monotone" dataKey="ticket" stroke="#b5005e" strokeWidth={2.5} dot={{ r: 3, fill: '#b5005e' }} name="Ticket Medio" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm font-bold text-gray-800 mb-3">🏆 Maiores ticket por cliente</p>
              <div className="space-y-0.5">
                {rankingCompleto.slice(0, 8).sort((a, b) => b.ticketMedCli - a.ticketMedCli).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-400 w-5 text-center">{i+1}</span>
                    <div className="w-7 h-7 rounded-full bg-pink-100 flex-shrink-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#b5005e]">{(c.nome||'?').slice(0,2).toUpperCase()}</span>
                    </div>
                    <p className="flex-1 text-xs font-semibold text-gray-800 truncate">{c.nome}</p>
                    <p className="text-xs font-bold text-green-700">{formatCurrency(c.ticketMedCli)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>}

          {/* ── 8. INSIGHTS CRM ─────────────────────────────────────────────── */}
          {subAbaCli === 'insights' && <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={18} className="text-yellow-500" />
                <p className="text-sm font-bold text-gray-800">Insights dos Clientes</p>
              </div>
              {insightsCRM.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sem dados suficientes para gerar insights</p>
              ) : (
                <div className="space-y-2">
                  {insightsCRM.map((ins, i) => (
                    <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed ${
                      ins.tipo === 'ok' ? 'bg-green-50 text-green-800' : ins.tipo === 'alerta' ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-700'
                    }`}>
                      <span className="text-base flex-shrink-0">{ins.emoji}</span>
                      <span>{ins.texto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>}

          {/* ── 9. OPORTUNIDADES ────────────────────────────────────────────── */}
          {subAbaCli === 'oportunidades' && <>
            <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} />
                <p className="font-bold text-sm">Oportunidades Identificadas</p>
              </div>
              <p className="text-xs text-pink-200">{oportunidades.length} oportunidade{oportunidades.length !== 1 ? 's' : ''} encontrada{oportunidades.length !== 1 ? 's' : ''}</p>
            </div>

            {oportunidades.length === 0 ? (
              <div className="bg-green-50 rounded-2xl border border-green-200 p-6 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="text-sm font-semibold text-green-700">Tudo em dia!</p>
                <p className="text-xs text-green-500 mt-1">Nenhuma oportunidade critica no momento</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {oportunidades.map((op, i) => {
                  const bg   = op.tipo === 'acao' ? 'bg-orange-50 border-orange-200' : op.tipo === 'vip' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
                  const text = op.tipo === 'acao' ? 'text-orange-700' : op.tipo === 'vip' ? 'text-purple-700' : 'text-blue-700'
                  const sub  = op.tipo === 'acao' ? 'text-orange-500' : op.tipo === 'vip' ? 'text-purple-400' : 'text-blue-400'
                  return (
                    <div key={i} className={`rounded-2xl border p-4 ${bg}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{op.emoji}</span>
                        <div>
                          <p className={`text-sm font-bold ${text}`}>{op.titulo}</p>
                          <p className={`text-xs mt-0.5 ${sub}`}>{op.desc}</p>
                        </div>
                      </div>
                      {op.tipo === 'acao' && inativos180.length > 0 && op.titulo.includes('inativos') && (
                        <button onClick={() => setSubAbaCli('inativos')}
                          className="mt-3 flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                          <Users size={12} /> Ver clientes inativos
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>}

        </>}

        {/* ══ ABA: ESTOQUE ═══════════════════════════════════════════════ */}
        {aba === 'est' && <>
          {/* Sub-nav */}
          <div className="overflow-x-auto -mx-4 px-4 pb-1">
            <div className="flex gap-1.5 min-w-max">
              {([
                ['visao','📦 Visao Geral'],['consumo','📈 Consumo'],['invest','💰 Investimento'],
                ['giro','🔄 Giro'],['reposicao','🚚 Reposicao'],['capacidade','🏭 Capacidade'],
                ['curvaABC','📊 Curva ABC'],['insights','💡 Insights'],
              ] as [SubEst,string][]).map(([id,label]) => (
                <button key={id} onClick={() => setSubAbaEst(id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    subAbaEst === id ? 'bg-[#b5005e] text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 1 VISÃO GERAL */}
          {subAbaEst === 'visao' && <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white col-span-2">
                <p className="text-xs text-pink-200 mb-0.5">📦 Valor Total em Estoque</p>
                <p className="text-3xl font-bold">{formatCurrency(valorEstTotal)}</p>
                <p className="text-[10px] text-pink-200 mt-1">{insumos.length} insumo(s) cadastrado(s)</p>
              </div>
              <div className={`rounded-2xl border shadow-sm p-4 ${criticos.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-1 mb-0.5">
                  <AlertTriangle size={12} className={criticos.length > 0 ? 'text-red-500' : 'text-green-500'} />
                  <p className={`text-xs font-semibold ${criticos.length > 0 ? 'text-red-600' : 'text-green-600'}`}>Criticos</p>
                </div>
                <p className={`text-3xl font-bold ${criticos.length > 0 ? 'text-red-700' : 'text-green-700'}`}>{criticos.length}</p>
              </div>
              <div className={`rounded-2xl border shadow-sm p-4 ${baixos.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                <p className={`text-xs font-semibold mb-0.5 ${baixos.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>🟡 Estoque Baixo</p>
                <p className={`text-3xl font-bold ${baixos.length > 0 ? 'text-yellow-700' : 'text-green-700'}`}>{baixos.length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-0.5">📈 Movimentacoes</p>
                <p className="text-2xl font-bold text-gray-900">{movEstMes.length}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{MESES[mes]}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-0.5">📦 Total Insumos</p>
                <p className="text-2xl font-bold text-gray-900">{insumos.length}</p>
              </div>
            </div>
            {/* Lista de criticos */}
            {criticos.length > 0 && (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-red-500" />
                  <p className="text-sm font-bold text-red-700">Materiais Criticos</p>
                </div>
                <div className="space-y-2">
                  {criticos.map(i => (
                    <div key={i.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                      <p className="text-sm font-semibold text-gray-800">{i.nome}</p>
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        {Number(i.quantidade||0).toFixed(1)} {i.unidade}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Lista todos os insumos */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                <p className="text-sm font-bold text-gray-800">Todos os Insumos</p>
              </div>
              {insumos.map(i => {
                const st = calcStatusEst(i)
                const stCor = st==='critico' ? 'bg-red-500' : st==='baixo' ? 'bg-yellow-400' : 'bg-green-400'
                const valEst = Number(i.quantidade||0)*Number(i.custo_unitario||0)
                return (
                  <div key={i.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-0">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stCor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{i.nome}</p>
                      <p className="text-[10px] text-gray-400">{catInsumo(i.tipo||'')} · min: {i.estoque_minimo||0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{Number(i.quantidade||0).toFixed(1)} {i.unidade}</p>
                      <p className="text-[10px] text-gray-400">{formatCurrency(valEst)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={exportarCSVEstoque}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all">
                <Download size={13} /> Excel
              </button>
              <button onClick={exportarPDFEstoque}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#b5005e] text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all">
                <Download size={13} /> PDF
              </button>
            </div>
          </>}

          {/* 2 CONSUMO */}
          {subAbaEst === 'consumo' && <>
            {consumoPorMat.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">📦</p>
                <p className="text-sm text-gray-500">Nenhum consumo em {MESES[mes]}</p>
              </div>
            ) : (<>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-800 mb-3">📈 Mais consumidos — {MESES[mes]}</p>
                <div className="space-y-3">
                  {consumoPorMat.map((m,i) => {
                    const tot = consumoPorMat.reduce((s,x)=>s+x.qtd,0)
                    const p   = tot > 0 ? Math.round((m.qtd/tot)*100) : 0
                    return (
                      <div key={m.nome}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700 truncate max-w-[55%]">{m.nome}</span>
                          <span className="text-xs text-gray-500">{m.qtd.toFixed(1)} · {p}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-2 rounded-full" style={{ width:`${p}%`, backgroundColor: ['#b5005e','#3b82f6','#10b981','#f59e0b','#8b5cf6'][i]||'#94a3b8' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {consumoMensal.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-sm font-bold text-gray-800 mb-3">📊 Consumo por mes (total de unidades)</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={consumoMensal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} width={36} />
                      <Tooltip formatter={(v:any)=>[Number(v).toFixed(1),'Unidades']} />
                      <Bar dataKey="valor" fill="#b5005e" radius={[4,4,0,0]} name="Consumo" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {consumoPorMat.length >= 3 && (
                <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4">
                  <p className="text-xs font-bold text-blue-700 mb-2">📉 Menos consumidos</p>
                  <div className="space-y-1.5">
                    {[...consumoPorMat].reverse().slice(0,3).map(m => (
                      <div key={m.nome} className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-blue-800">{m.nome}</p>
                        <p className="text-xs text-blue-600">{m.qtd.toFixed(1)} un</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>)}
          </>}

          {/* 3 INVESTIMENTO */}
          {subAbaEst === 'invest' && <>
            {investPorCat.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">💰</p>
                <p className="text-sm text-gray-500">Nenhuma compra em {MESES[mes]}</p>
              </div>
            ) : (<>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-800 mb-4">💰 Investimento por Categoria — {MESES[mes]}</p>
                <ComposicaoBar items={investPorCat.map(c=>({nome:c.cat,valor:c.val,cor:c.cor}))} total={investPorCat.reduce((s,c)=>s+c.val,0)} />
              </div>
              {investMensal.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <p className="text-sm font-bold text-gray-800 mb-3">📈 Evolucao do Investimento</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={investMensal}>
                      <defs>
                        <linearGradient id="gInvEst" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#b5005e" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#b5005e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`} width={44} />
                      <Tooltip formatter={(v:any)=>[formatCurrency(Number(v)),'Investimento']} />
                      <Area type="monotone" dataKey="valor" stroke="#b5005e" fill="url(#gInvEst)" strokeWidth={2.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>)}
          </>}

          {/* 4 GIRO */}
          {subAbaEst === 'giro' && <>
            {giroMateriais.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center"><p className="text-4xl mb-3">🔄</p><p className="text-sm text-gray-500">Sem movimentacoes</p></div>
            ) : (<>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-800">🔄 Materiais por Giro</p>
                  <p className="text-xs text-gray-400">Ordenado por maior consumo historico</p>
                </div>
                {giroMateriais.map((g,i) => {
                  const dias = g.ultimaData ? diasAtras(g.ultimaData) : null
                  const parado = dias !== null && dias > 30
                  return (
                    <div key={g.nome} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-0">
                      <span className={`w-2 h-8 rounded-full flex-shrink-0 ${i===0?'bg-[#b5005e]':i<=2?'bg-orange-400':'bg-gray-200'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{g.nome}</p>
                        <p className="text-[10px] text-gray-400">
                          {g.saidas.toFixed(1)} saidas · {g.entradas.toFixed(1)} entradas
                          {g.ultimaData && <> · ult: {fmtData(g.ultimaData)}</>}
                        </p>
                      </div>
                      {parado && <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">{dias}d parado</span>}
                    </div>
                  )
                })}
              </div>
              {/* sem movimentacao */}
              {(() => { const semMov = insumos.filter(i=>!giroMateriais.find(g=>g.nome===i.nome)); return semMov.length > 0 ? (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">⏸ Sem movimentacao registrada</p>
                  <div className="space-y-1">
                    {semMov.map(i=><p key={i.id} className="text-xs text-gray-600">{i.nome}</p>)}
                  </div>
                </div>
              ) : null })()}
            </>)}
          </>}

          {/* 5 REPOSIÇÃO */}
          {subAbaEst === 'reposicao' && <>
            {reposicaoSugerida.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">🚚</p>
                <p className="text-sm text-gray-500">Sem dados de consumo suficientes para previsao</p>
                <p className="text-xs text-gray-400 mt-1">Necessario pelo menos 1 saida nos ultimos 30 dias</p>
              </div>
            ) : (<>
              <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
                <p className="text-xs font-bold text-orange-700 mb-1">🚚 Reposicao Sugerida</p>
                <p className="text-[10px] text-orange-500">Baseado no consumo medio dos ultimos 30 dias</p>
              </div>
              <div className="space-y-2.5">
                {reposicaoSugerida.map((r,i) => {
                  if (!r) return null
                  const urgente = r.diasRest <= 10
                  const moderado = r.diasRest <= 20 && !urgente
                  return (
                    <div key={i} className={`rounded-2xl border p-4 ${urgente?'bg-red-50 border-red-200':moderado?'bg-orange-50 border-orange-200':'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold ${urgente?'text-red-700':moderado?'text-orange-700':'text-gray-900'}`}>
                          {urgente?'⚠️':moderado?'🟡':'🟢'} {r.nome}
                        </p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urgente?'bg-red-100 text-red-700':moderado?'bg-orange-100 text-orange-700':'bg-green-100 text-green-700'}`}>
                          {r.diasRest} dias
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-500">Estoque: {r.qtdAtual.toFixed(1)} {r.unidade}</p>
                        <p className="text-[10px] text-gray-500">Consumo: ~{r.diario}/dia</p>
                      </div>
                      {/* barra de urgencia */}
                      <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-1.5 rounded-full ${urgente?'bg-red-500':moderado?'bg-orange-400':'bg-green-400'}`}
                          style={{ width: `${Math.min(100, Math.round((r.diasRest/60)*100))}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>)}
          </>}

          {/* 6 CAPACIDADE */}
          {subAbaEst === 'capacidade' && <>
            <div className="bg-gradient-to-br from-[#b5005e] to-pink-700 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Package size={16} />
                <p className="font-bold text-sm">Capacidade de Producao</p>
              </div>
              <p className="text-xs text-pink-200">Com base no estoque atual de insumos</p>
            </div>
            {capacidadeProducao.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">🏭</p>
                <p className="text-sm text-gray-500">Nenhum pedido com imas registrado para calcular capacidade</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {capacidadeProducao.map(c => {
                  const urg = c.capacidade < 5
                  return (
                    <div key={c.nome} className={`rounded-2xl border p-4 ${urg?'bg-red-50 border-red-200':'bg-white border-gray-100 shadow-sm'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-bold text-gray-900">{c.nome}</p>
                        <span className={`text-2xl font-bold ${urg?'text-red-600':'text-green-700'}`}>{c.capacidade}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {c.capacidade === 0 ? '🔴 Impossivel produzir — sem estoque suficiente' : `${c.capacidade} unidade(s) possiveis`}
                      </p>
                      {c.limitante && (
                        <p className="text-[10px] text-orange-600 mt-1 font-semibold">
                          Material limitante: {c.limitante}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>}

          {/* 7 CURVA ABC */}
          {subAbaEst === 'curvaABC' && <>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#b5005e] rounded-2xl p-3 text-center text-white">
                <p className="text-2xl font-bold">{qtdA}</p>
                <p className="text-xs text-pink-200">Classe A</p>
                <p className="text-[10px] text-pink-300">80% consumo</p>
              </div>
              <div className="bg-blue-600 rounded-2xl p-3 text-center text-white">
                <p className="text-2xl font-bold">{qtdB}</p>
                <p className="text-xs text-blue-200">Classe B</p>
                <p className="text-[10px] text-blue-300">15% consumo</p>
              </div>
              <div className="bg-gray-400 rounded-2xl p-3 text-center text-white">
                <p className="text-2xl font-bold">{qtdC}</p>
                <p className="text-xs text-gray-100">Classe C</p>
                <p className="text-[10px] text-gray-200">5% consumo</p>
              </div>
            </div>
            {curvaABC.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-8 text-center"><p className="text-4xl mb-3">📊</p><p className="text-sm text-gray-500">Sem historico de consumo para classificar</p></div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 border-b border-gray-50">
                  <p className="text-sm font-bold text-gray-800">📊 Classificacao ABC</p>
                  <p className="text-xs text-gray-400">Baseado no consumo historico total</p>
                </div>
                {curvaABC.map(item => {
                  const corClasse = item.classe==='A'?'bg-[#b5005e] text-white':item.classe==='B'?'bg-blue-600 text-white':'bg-gray-300 text-gray-700'
                  return (
                    <div key={item.nome} className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 first:border-0">
                      <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${corClasse}`}>{item.classe}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{item.nome}</p>
                        <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-1 rounded-full" style={{ width:`${item.pct}%`, backgroundColor: item.classe==='A'?'#b5005e':item.classe==='B'?'#3b82f6':'#9ca3af' }} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-gray-900">{item.pct}%</p>
                        <p className="text-[10px] text-gray-400">acum: {item.pctAcum}%</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>}

          {/* 8 INSIGHTS */}
          {subAbaEst === 'insights' && <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={18} className="text-yellow-500" />
                <p className="text-sm font-bold text-gray-800">Insights do Estoque</p>
              </div>
              {insightsEstoque.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Sem dados suficientes</p>
              ) : (
                <div className="space-y-2">
                  {insightsEstoque.map((ins,i) => (
                    <div key={i} className={`flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed ${
                      ins.tipo==='ok'?'bg-green-50 text-green-800':ins.tipo==='alerta'?'bg-red-50 text-red-800':'bg-gray-50 text-gray-700'
                    }`}>
                      <span className="text-base flex-shrink-0">{ins.emoji}</span>
                      <span>{ins.texto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={exportarCSVEstoque}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all">
                <Download size={13} /> Excel
              </button>
              <button onClick={exportarPDFEstoque}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#b5005e] text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all">
                <Download size={13} /> PDF
              </button>
            </div>
          </>}
        </>}

      </div>
    </div>
  )
}
