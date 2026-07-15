'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, MessageCircle, ChevronRight, ChevronDown, Truck, Pencil, Trash2,
  FolderOpen, Camera, Package, Download, Wrench, PlusCircle,
  DollarSign, TrendingUp, CheckSquare, Square,
} from 'lucide-react'
import JSZip from 'jszip'
import Link from 'next/link'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER } from '@/lib/utils/formatters'
import { calcularCustosPedido, CONFIG_PADRAO, type ConfigMateriais } from '@/lib/utils/custos'
import { descontarEstoque } from '@/lib/utils/estoque'

// ── checklist de produção (somente display, sem afetar status) ────────
type ChecklistKey = 'fotos_conferidas' | 'impressao_realizada' | 'imas_montados' | 'embalagem_finalizada'
const CHECKLIST_ITEMS: { key: ChecklistKey; label: string }[] = [
  { key: 'fotos_conferidas',    label: 'Fotos conferidas' },
  { key: 'impressao_realizada', label: 'Impressão realizada' },
  { key: 'imas_montados',       label: 'Ímãs montados' },
  { key: 'embalagem_finalizada',label: 'Embalagem finalizada' },
]
const DEFAULT_CHECKLIST: Record<ChecklistKey, boolean> = {
  fotos_conferidas: false,
  impressao_realizada: false,
  imas_montados: false,
  embalagem_finalizada: false,
}

export default function PedidoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // ── estado (preservado integralmente) ─────────────────────────────
  const [pedido, setPedido] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [configMateriais, setConfigMateriais] = useState<ConfigMateriais>(CONFIG_PADRAO)
  const [atualizando, setAtualizando] = useState(false)
  const [rastreio, setRastreio] = useState('')
  const [dataPostagem, setDataPostagem] = useState('')
  const [salvandoEnvio, setSalvandoEnvio] = useState(false)
  const [fotos, setFotos] = useState<{ name: string; url: string }[]>([])
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null)
  const [msgCopiada, setMsgCopiada] = useState(false)
  const [custosProducao, setCustosProducao] = useState<any[]>([])
  const [novoCustoDesc, setNovoCustoDesc] = useState('')
  const [novoCustoValor, setNovoCustoValor] = useState('')
  const [salvandoCusto, setSalvandoCusto] = useState(false)
  const [baixandoZip, setBaixandoZip] = useState(false)
  // visual only
  const [expandirMateriais, setExpandirMateriais] = useState(false)
  // checklist de produção (persiste em localStorage por pedido)
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>(DEFAULT_CHECKLIST)

  // ── funções de dados (preservadas integralmente) ───────────────────
  async function carregarCustosProducao() {
    const supabase = createClient()
    const { data } = await supabase
      .from('custos_producao')
      .select('*')
      .eq('pedido_id', id)
      .order('created_at')
    setCustosProducao(data || [])
  }

  async function adicionarCusto() {
    if (!novoCustoDesc.trim() || !novoCustoValor) return
    setSalvandoCusto(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
    const { error } = await supabase.from('custos_producao').insert({
      pedido_id: id,
      empresa_id: usuario!.empresa_id,
      descricao: novoCustoDesc.trim(),
      valor: parseFloat(novoCustoValor),
      data: new Date().toISOString().split('T')[0],
    })
    if (error) {
      alert('Erro ao lançar custo: ' + error.message)
      setSalvandoCusto(false)
      return
    }
    setNovoCustoDesc('')
    setNovoCustoValor('')
    await carregarCustosProducao()
    setSalvandoCusto(false)
  }

  async function removerCusto(custoId: string) {
    if (!confirm('Remover este custo?')) return
    const supabase = createClient()
    await supabase.from('custos_producao').delete().eq('id', custoId)
    await carregarCustosProducao()
  }

  async function carregarFotos() {
    const supabase = createClient()
    const { data: arquivos } = await supabase.storage
      .from('fotos-clientes')
      .list(`pedidos/${id}`)
    if (!arquivos || arquivos.length === 0) return
    const urls = await Promise.all(
      arquivos.map(async (f) => {
        const { data } = await supabase.storage
          .from('fotos-clientes')
          .createSignedUrl(`pedidos/${id}/${f.name}`, 3600)
        return { name: f.name, url: data?.signedUrl || '' }
      })
    )
    setFotos(urls.filter(f => f.url))
  }

  async function carregar() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
    const [{ data: p }, { data: i }, { data: cfg }] = await Promise.all([
      supabase.from('pedidos').select('*, clientes(*)').eq('id', id).single(),
      supabase.from('itens_pedido').select('*').eq('pedido_id', id).order('created_at'),
      supabase.from('configuracoes_materiais').select('*').eq('empresa_id', usuario!.empresa_id).single(),
    ])
    setPedido(p)
    setItens(i || [])
    setRastreio(p?.codigo_rastreio || '')
    setDataPostagem(p?.data_postagem || '')
    if (cfg) {
      setConfigMateriais({
        ima_custo: Number(cfg.ima_custo),
        caixa_custo: Number(cfg.caixa_custo),
        saquinho_custo: Number(cfg.saquinho_custo),
        envelope_custo: Number(cfg.envelope_custo),
        papel_seda_custo: Number(cfg.papel_seda_custo),
        cartao_custo: Number(cfg.cartao_custo),
        adesivo_caixa_custo: Number(cfg.adesivo_caixa_custo || 0.32),
        lacre_caixa_custo: Number(cfg.lacre_caixa_custo || 0.27),
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    carregar()
    carregarFotos()
    carregarCustosProducao()
    // carregar checklist do localStorage
    const saved = localStorage.getItem(`reviva_prod_check_${id}`)
    if (saved) {
      try { setChecklist(JSON.parse(saved)) } catch { /* ignora */ }
    }
  }, [id])

  // ── toggle checklist (sem tocar no banco) ─────────────────────────
  function toggleCheck(key: ChecklistKey) {
    const updated = { ...checklist, [key]: !checklist[key] }
    setChecklist(updated)
    localStorage.setItem(`reviva_prod_check_${id}`, JSON.stringify(updated))
  }

  // ── ações (preservadas integralmente) ─────────────────────────────
  async function mudarStatus(novoStatus: string) {
    setAtualizando(true)
    const supabase = createClient()
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id)

    if (novoStatus === 'producao' && pedido && !pedido.estoque_descontado && Number(pedido.qtd_imas) > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const { data: cfg } = await supabase
        .from('configuracoes_materiais')
        .select('impressao_fotos_por_folha')
        .eq('empresa_id', usuario!.empresa_id)
        .single()
      const fotosPerFolha = cfg?.impressao_fotos_por_folha || 12
      await descontarEstoque(supabase, usuario!.empresa_id, Number(pedido.qtd_imas), fotosPerFolha, id)
    }

    await carregar()
    setAtualizando(false)
  }

  async function salvarEnvio() {
    setSalvandoEnvio(true)
    const supabase = createClient()
    const update: any = {
      codigo_rastreio: rastreio || null,
      data_postagem: dataPostagem || null,
    }
    if (rastreio && pedido?.status && !['enviado', 'entregue', 'cancelado'].includes(pedido.status)) {
      update.status = 'enviado'
    }
    await supabase.from('pedidos').update(update).eq('id', id)
    await carregar()
    setSalvandoEnvio(false)
  }

  function rastrearPedido() {
    if (!rastreio && !pedido?.codigo_rastreio) return
    const codigo = rastreio || pedido.codigo_rastreio
    window.open(`https://rastreamento.correios.com.br/app/index.php?objetos=${codigo}`, '_blank')
  }

  function informarEnvio() {
    if (!pedido?.clientes?.whatsapp) return
    const numero = pedido.clientes.whatsapp.replace(/\D/g, '')
    const nome = pedido.clientes.nome
    const codigo = pedido.codigo_rastreio || rastreio
    const mensagem = [
      `Ola, ${nome}!`,
      ``,
      `Seu pedido ja foi enviado e esta a caminho.`,
      ``,
      `Codigo de rastreio:`,
      codigo,
      ``,
      `Acompanhe sua entrega pelo site dos Correios:`,
      `https://rastreamento.correios.com.br`,
      ``,
      `Qualquer duvida estou a disposicao.`,
    ].join('\n')
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  async function cancelar() {
    if (!confirm('Cancelar este pedido?')) return
    await fetch('/api/pedidos/restaurar-estoque', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidoId: id }),
    })
    await mudarStatus('cancelado')
  }

  async function excluir() {
    if (!confirm('Excluir este pedido permanentemente? Esta ação não pode ser desfeita.')) return
    await fetch('/api/pedidos/restaurar-estoque', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidoId: id }),
    })
    const supabase = createClient()
    await supabase.from('itens_pedido').delete().eq('pedido_id', id)
    await supabase.from('pedidos').delete().eq('id', id)
    router.push('/pedidos')
  }

  function abrirWhatsApp() {
    if (!pedido?.clientes?.whatsapp) return
    const numero = pedido.clientes.whatsapp.replace(/\D/g, '')
    const dataEntrega = pedido.data_entrega ? `\nEntrega: ${formatDate(pedido.data_entrega)}` : ''
    const listaItens = itens.map(i => `• ${i.nome_produto} x${i.quantidade} — ${formatCurrency(i.subtotal)}`).join('\n')
    const mensagem = `Ola ${pedido.clientes.nome}!\n\nSeu pedido #${pedido.numero}:\n${listaItens}${dataEntrega}\n\n*Total: ${formatCurrency(pedido.valor_total)}*\n\nStatus: ${STATUS_LABELS[pedido.status]}`
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  async function baixarFotosZip() {
    if (fotos.length === 0) return
    setBaixandoZip(true)
    try {
      const zip = new JSZip()
      await Promise.all(
        fotos.map(async (foto) => {
          const res = await fetch(foto.url)
          const blob = await res.blob()
          zip.file(foto.name, blob)
        })
      )
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const nomeCliente = pedido?.clientes?.nome?.replace(/[^a-z0-9]/gi, '_') || 'fotos'
      const a = document.createElement('a')
      a.href = url
      a.download = `${nomeCliente}-fotos.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Erro ao gerar ZIP. Tente novamente.')
    } finally {
      setBaixandoZip(false)
    }
  }

  async function enviarSolicitacaoFotos() {
    if (!pedido?.clientes?.whatsapp) return
    const numero = pedido.clientes.whatsapp.replace(/\D/g, '')
    const nome = pedido.clientes.nome
    const linkUpload = `https://reviva-mvp.vercel.app/enviar-fotos/${pedido.id}`
    const mensagem = [
      `Oii, ${nome}!`,
      ``,
      `Seu pedido foi recebido com sucesso!`,
      ``,
      `Para darmos inicio a producao, precisamos das suas fotos.`,
      `Acesse o link abaixo e envie diretamente pelo celular:`,
      ``,
      `${linkUpload}`,
      ``,
      `Qualquer duvida estou a disposicao!`,
      `Com carinho, Reviva`,
    ].join('\n')
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  // ── estados de carregamento ────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#b5005e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!pedido) return (
    <div className="p-4 text-center py-16">
      <p className="text-gray-500">Pedido não encontrado</p>
      <Link href="/pedidos" className="text-[#b5005e] underline mt-2 block">Voltar</Link>
    </div>
  )

  // ── cálculos (preservados integralmente) ──────────────────────────
  const proximosStatus = STATUS_ORDER[pedido.status] || []
  const qtdImasPedido = pedido.qtd_imas || 0
  const custosSalvos = qtdImasPedido > 0 ? {
    custo_imas: Number(pedido.custo_imas || 0),
    custo_saquinhos: Number(pedido.custo_saquinhos || 0),
    custo_caixa: Number(pedido.custo_caixa || 0),
    custo_envelope: Number(pedido.custo_envelope || 0),
    custo_papel_seda: Number(pedido.custo_papel_seda || 0),
    custo_cartao: Number(pedido.custo_cartao || 0),
    custo_total_pedido: Number(pedido.custo_total_pedido || 0),
  } : null
  const totalCustosProducao = custosProducao.reduce((s, c) => s + Number(c.valor), 0)
  const lucroReal = Number(pedido.valor_recebido ?? pedido.valor_total)
    - Number(custosSalvos?.custo_total_pedido || 0)
    - totalCustosProducao

  // cálculo visual de prazo (somente display)
  const diasParaEntrega = pedido.data_entrega
    ? Math.ceil(
        (new Date(pedido.data_entrega + 'T12:00:00').getTime() - new Date().setHours(12, 0, 0, 0)) /
        (1000 * 60 * 60 * 24)
      )
    : null

  const margemPct = pedido.valor_total > 0
    ? Math.round((lucroReal / Number(pedido.valor_total)) * 100)
    : 0

  const temEnvio = pedido.transportadora || pedido.frete_valor > 0 || pedido.codigo_rastreio || rastreio

  // ── progresso de fotos ─────────────────────────────────────────────
  const qtdFotosEsperadas = qtdImasPedido > 0 ? qtdImasPedido : null
  const progresso = qtdFotosEsperadas
    ? Math.min(100, Math.round((fotos.length / qtdFotosEsperadas) * 100))
    : fotos.length > 0 ? 100 : 0
  const fotosCompletas = qtdFotosEsperadas ? fotos.length >= qtdFotosEsperadas : fotos.length > 0

  // ── render ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 pb-28">

      {/* ── BARRA DE NAVEGAÇÃO ── */}
      <div className="flex items-center justify-between pt-4 mb-4">
        <Link href="/pedidos" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <Link
          href={`/pedidos/${id}/editar`}
          className="flex items-center gap-1.5 bg-white border border-gray-200 shadow-sm text-gray-600 px-3 py-2 rounded-xl text-sm font-medium"
        >
          <Pencil size={14} />
          Editar
        </Link>
      </div>

      {/* ── 1. CABEÇALHO DO PEDIDO ── */}
      <div className="bg-[#b5005e] rounded-2xl p-5 mb-4 shadow-md shadow-pink-200">

        {/* número + status */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-pink-300 text-[11px] font-semibold uppercase tracking-widest mb-0.5">Pedido</p>
            <p className="text-3xl font-bold text-white">#{pedido.numero}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
            {STATUS_LABELS[pedido.status]}
          </span>
        </div>

        {/* cliente */}
        <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2.5 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">
                {pedido.clientes?.nome?.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-white text-sm leading-tight">{pedido.clientes?.nome}</p>
              {pedido.clientes?.whatsapp && (
                <p className="text-pink-200 text-xs">{pedido.clientes.whatsapp}</p>
              )}
            </div>
          </div>
          {pedido.clientes?.whatsapp && (
            <button
              onClick={abrirWhatsApp}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <MessageCircle size={13} />
              WhatsApp
            </button>
          )}
        </div>

        {/* data de entrega + valor */}
        <div className="flex gap-2.5">
          {pedido.data_entrega && (
            <div className="flex-1 bg-white/10 rounded-xl px-3 py-2.5">
              <p className="text-pink-300 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Entrega</p>
              <p className="text-white text-sm font-bold">{formatDate(pedido.data_entrega)}</p>
              {diasParaEntrega !== null && (
                <p className={`text-[10px] font-semibold mt-0.5 ${
                  diasParaEntrega < 0 ? 'text-red-300'
                  : diasParaEntrega <= 2 ? 'text-yellow-300'
                  : 'text-pink-300'
                }`}>
                  {diasParaEntrega < 0
                    ? `${Math.abs(diasParaEntrega)}d atrasado`
                    : diasParaEntrega === 0 ? 'hoje'
                    : `em ${diasParaEntrega}d`}
                </p>
              )}
            </div>
          )}
          <div className="flex-1 bg-white/10 rounded-xl px-3 py-2.5">
            <p className="text-pink-300 text-[10px] font-semibold uppercase tracking-wide mb-0.5">
              {pedido.forma_pagamento === 'pix' ? 'Pix' : pedido.forma_pagamento === 'link' ? 'Link' : 'Recebido'}
            </p>
            <p className="text-white text-sm font-bold">
              {pedido.tipo === 'mimo' ? 'Mimo' : formatCurrency(pedido.valor_recebido ?? pedido.valor_total)}
            </p>
          </div>
          {pedido.origem === 'nuvemshop' && (
            <div className="bg-white/10 rounded-xl px-3 py-2.5 flex items-center">
              <p className="text-purple-200 text-xs font-bold">Nuvemshop</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. FINANCEIRO ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <DollarSign size={14} className="text-green-600" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Financeiro</p>
        </div>
        <div className="p-4">

          {/* itens do pedido */}
          {itens.length > 0 && (
            <div className="space-y-2 mb-3">
              {itens.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.nome_produto}</p>
                    <p className="text-xs text-gray-400">{item.quantidade}x {formatCurrency(item.preco_unitario)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
          )}

          {/* resumo financeiro */}
          <div className="space-y-2 pt-3 border-t border-gray-100 text-sm">

            {pedido.desconto > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Desconto</span>
                <span>−{formatCurrency(pedido.desconto)}</span>
              </div>
            )}

            <div className="flex justify-between font-semibold text-gray-800">
              <span>Valor da venda</span>
              <span>{formatCurrency(pedido.valor_total)}</span>
            </div>

            {/* custo de material — expansível */}
            {custosSalvos && custosSalvos.custo_total_pedido > 0 && (
              <>
                <button
                  onClick={() => setExpandirMateriais(!expandirMateriais)}
                  className="w-full flex justify-between items-center text-gray-500 hover:text-gray-700 py-0.5 transition-colors"
                >
                  <span>Custo de material <span className="text-gray-400 text-xs">({qtdImasPedido} ímãs)</span></span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-orange-600 font-semibold">−{formatCurrency(custosSalvos.custo_total_pedido)}</span>
                    <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${expandirMateriais ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expandirMateriais && (
                  <div className="ml-3 border-l-2 border-gray-100 pl-3 space-y-1.5 py-1">
                    {[
                      { label: 'Ímãs',         val: custosSalvos.custo_imas },
                      { label: 'Saquinhos',     val: custosSalvos.custo_saquinhos },
                      { label: 'Caixa',         val: custosSalvos.custo_caixa },
                      { label: 'Envelope',      val: custosSalvos.custo_envelope },
                      { label: 'Papel Seda',    val: custosSalvos.custo_papel_seda },
                      { label: 'Cartão Reviva', val: custosSalvos.custo_cartao },
                    ].map(({ label, val }) => val > 0 && (
                      <div key={label} className="flex justify-between text-xs text-gray-500">
                        <span>{label}</span>
                        <span>{formatCurrency(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* custos de produção — resumo (detalhe fica em Produção) */}
            {totalCustosProducao > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>
                  Custos de produção
                  <span className="text-gray-400 text-xs ml-1">({custosProducao.length})</span>
                </span>
                <span className="text-red-500 font-semibold">−{formatCurrency(totalCustosProducao)}</span>
              </div>
            )}

            {/* lucro */}
            <div className={`flex justify-between items-start font-bold text-base pt-3 border-t border-gray-100 ${lucroReal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={15} />
                <span>Lucro do pedido</span>
              </div>
              <div className="text-right">
                <p>{formatCurrency(lucroReal)}</p>
                {pedido.valor_total > 0 && (
                  <p className="text-[11px] font-normal text-gray-400">margem {margemPct}%</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. PRODUÇÃO ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Wrench size={14} className="text-[#b5005e]" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Produção</p>
          {fotos.length > 0 && (
            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${fotosCompletas ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
              {fotos.length} foto{fotos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-50">

          {/* ── A. Drive ── */}
          <div className="p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Pasta de Fotos</p>
            {pedido.link_pasta_drive ? (
              <a
                href={pedido.link_pasta_drive}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm font-bold text-yellow-800 active:scale-95 transition-all"
              >
                <FolderOpen size={18} className="text-yellow-600 shrink-0" />
                <span className="flex-1">Abrir pasta no Google Drive</span>
                <ChevronRight size={14} className="text-yellow-500" />
              </a>
            ) : (
              <Link
                href={`/pedidos/${id}/editar`}
                className="flex items-center gap-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 active:scale-95 transition-all"
              >
                <FolderOpen size={18} className="text-gray-400 shrink-0" />
                <span className="flex-1">Adicionar link do Drive</span>
                <ChevronRight size={14} className="text-gray-400" />
              </Link>
            )}
          </div>

          {/* ── B. Fotos recebidas ── */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Fotos recebidas</p>
              {qtdFotosEsperadas && (
                <span className={`text-sm font-bold ${fotosCompletas ? 'text-green-600' : 'text-gray-600'}`}>
                  {fotos.length} / {qtdFotosEsperadas}
                </span>
              )}
              {!qtdFotosEsperadas && fotos.length > 0 && (
                <span className="text-sm font-bold text-gray-600">{fotos.length}</span>
              )}
            </div>

            {/* barra de progresso */}
            {qtdFotosEsperadas && (
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${fotosCompletas ? 'bg-green-500' : 'bg-[#b5005e]'}`}
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <p className={`text-[10px] font-semibold mt-1 ${fotosCompletas ? 'text-green-600' : 'text-gray-400'}`}>
                  {fotosCompletas ? '✓ Todas as fotos recebidas' : `${progresso}% — faltam ${qtdFotosEsperadas - fotos.length}`}
                </p>
              </div>
            )}

            {/* solicitar fotos */}
            {pedido.clientes?.whatsapp && (
              <button
                onClick={enviarSolicitacaoFotos}
                className="w-full flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm font-medium text-green-800 active:scale-95 transition-all mb-3"
              >
                <Camera size={15} className="text-green-600 shrink-0" />
                <span className="flex-1">Solicitar fotos via WhatsApp</span>
              </button>
            )}

            {/* grade de fotos */}
            {fotos.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-2">Nenhuma foto enviada ainda.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {fotos.map((foto) => (
                    <div key={foto.name} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src={foto.url}
                        alt={foto.name}
                        className="w-full h-full object-cover cursor-pointer active:scale-95 transition-all"
                        onClick={() => setFotoAmpliada(foto.url)}
                      />
                      <a
                        href={foto.url}
                        download={foto.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-1 right-1 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <Download size={12} className="text-white" />
                      </a>
                    </div>
                  ))}
                </div>
                <button
                  onClick={baixarFotosZip}
                  disabled={baixandoZip}
                  className="w-full flex items-center justify-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5 text-sm font-medium text-purple-800 active:scale-95 transition-all disabled:opacity-60"
                >
                  <Download size={15} className="text-purple-600 shrink-0" />
                  {baixandoZip ? 'Gerando ZIP...' : `Baixar todas as fotos (${fotos.length}) em ZIP`}
                </button>
              </>
            )}
          </div>

          {/* ── C. Checklist de produção ── */}
          <div className="p-4">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Checklist</p>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map(({ key, label }) => {
                const marcado = checklist[key]
                return (
                  <button
                    key={key}
                    onClick={() => toggleCheck(key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.98] text-left ${
                      marcado
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {marcado
                      ? <CheckSquare size={18} className="text-green-600 shrink-0" />
                      : <Square size={18} className="text-gray-300 shrink-0" />
                    }
                    <span className={`text-sm font-medium ${marcado ? 'text-green-800 line-through decoration-green-400' : 'text-gray-700'}`}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-300 mt-2 text-center">Controle interno — não altera o status do pedido</p>
          </div>

          {/* ── D. Custos de produção reais ── */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Wrench size={11} className="text-gray-400" />
                Custos de produção reais
              </p>
              {totalCustosProducao > 0 && (
                <span className="text-sm font-bold text-red-500">−{formatCurrency(totalCustosProducao)}</span>
              )}
            </div>

            {/* lista de custos */}
            {custosProducao.length > 0 && (
              <div className="space-y-2 mb-3">
                {custosProducao.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removerCusto(c.id)}
                        className="text-red-300 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="text-sm text-gray-700">{c.descricao}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600">−{formatCurrency(Number(c.valor))}</span>
                  </div>
                ))}
              </div>
            )}

            {/* form: lançar novo custo */}
            <div className={`${custosProducao.length > 0 ? 'pt-3 border-t border-dashed border-gray-200' : ''}`}>
              <p className="text-xs text-gray-400 mb-2">Lançar custo real</p>
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {['Impressão', 'Frete', 'Outro'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setNovoCustoDesc(opt)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                      novoCustoDesc === opt
                        ? 'bg-[#b5005e] text-white border-[#b5005e]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-pink-300'
                    }`}
                  >{opt}</button>
                ))}
              </div>
              <input
                type="text"
                value={novoCustoDesc}
                onChange={e => setNovoCustoDesc(e.target.value)}
                placeholder="Descrição do custo"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 mb-2"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={novoCustoValor}
                  onChange={e => setNovoCustoValor(e.target.value)}
                  placeholder="Valor (R$)"
                  step="0.01"
                  min="0"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
                <button
                  onClick={adicionarCusto}
                  disabled={salvandoCusto || !novoCustoDesc.trim() || !novoCustoValor}
                  className="flex items-center gap-1.5 bg-[#b5005e] text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
                >
                  {salvandoCusto ? '...' : <><PlusCircle size={14} /> Lançar</>}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 4. ENVIO ── */}
      {temEnvio && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Package size={14} className="text-blue-500" />
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Envio</p>
          </div>
          <div className="p-4 space-y-3">

            {/* info de frete */}
            {(pedido.transportadora || pedido.frete_valor > 0) && (
              <div className="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5">
                {pedido.transportadora && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Transportadora</span>
                    <span className="font-medium text-gray-800">{pedido.transportadora}</span>
                  </div>
                )}
                {pedido.frete_valor > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valor do frete</span>
                    <span className="font-medium text-gray-800">{formatCurrency(pedido.frete_valor)}</span>
                  </div>
                )}
                {pedido.prazo_entrega && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Prazo</span>
                    <span className="font-medium text-gray-800">{pedido.prazo_entrega}</span>
                  </div>
                )}
              </div>
            )}

            {/* campos de envio */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Data de Postagem</p>
              <input
                type="date"
                value={dataPostagem}
                onChange={e => setDataPostagem(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Código de Rastreio</p>
              <input
                type="text"
                value={rastreio}
                onChange={e => setRastreio(e.target.value)}
                placeholder="Ex: BR123456789BR"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <button
              onClick={salvarEnvio}
              disabled={salvandoEnvio}
              className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
            >
              {salvandoEnvio ? 'Salvando...' : 'Salvar dados de envio'}
            </button>

            {/* ações de rastreio */}
            {(pedido.codigo_rastreio || rastreio) && (
              <div className="pt-1 space-y-2">
                <button
                  onClick={rastrearPedido}
                  className="w-full flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-800 active:scale-95 transition-all"
                >
                  <Truck size={15} className="text-blue-600 shrink-0" />
                  <span className="flex-1">Rastrear pedido</span>
                  <ChevronRight size={13} className="text-blue-400" />
                </button>
                {pedido.clientes?.whatsapp && (
                  <button
                    onClick={informarEnvio}
                    className="w-full flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm font-medium text-green-800 active:scale-95 transition-all"
                  >
                    <MessageCircle size={15} className="text-green-600 shrink-0" />
                    <span className="flex-1">Informar envio ao cliente</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. OBSERVAÇÕES ── */}
      {pedido.observacoes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Observações</p>
          <p className="text-sm text-gray-700 leading-relaxed">{pedido.observacoes}</p>
        </div>
      )}

      {/* ── MOVER STATUS ── */}
      {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && proximosStatus.filter((s: string) => s !== 'cancelado').length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Avançar pedido</p>
          <div className="space-y-2">
            {proximosStatus.filter((s: string) => s !== 'cancelado').map((s: string) => (
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

      {/* ── AÇÕES DE RISCO ── */}
      <div className="space-y-2">
        {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
          <button
            onClick={cancelar}
            className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium active:scale-95 transition-all"
          >
            Cancelar pedido
          </button>
        )}
        <button
          onClick={excluir}
          className="w-full py-3 rounded-xl border border-red-300 bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Trash2 size={15} />
          Excluir pedido
        </button>
      </div>

      {/* ── LIGHTBOX ── */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <img
            src={fotoAmpliada}
            alt="Foto ampliada"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  )
}
