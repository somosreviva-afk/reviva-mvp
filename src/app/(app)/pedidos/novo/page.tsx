'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search, Gift } from 'lucide-react'
import Link from 'next/link'
import { calcularCustosPedido, CONFIG_PADRAO, type ConfigMateriais } from '@/lib/utils/custos'
import { descontarEstoque } from '@/lib/utils/estoque'

interface ItemPedido {
  produto_id: string
  nome: string
  preco_unitario: number
  preco_liquido: number
  quantidade: number
  qtd_imas: number
}

export default function NovoPedidoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [configMateriais, setConfigMateriais] = useState<ConfigMateriais>(CONFIG_PADRAO)
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null)
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [mostrarClientes, setMostrarClientes] = useState(false)
  const [mostrarProdutos, setMostrarProdutos] = useState(false)
  const [dataEntrega, setDataEntrega] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState('aguardando_fotos')
  const [desconto, setDesconto] = useState('')
  const [freteValor, setFreteValor] = useState('')
  const [transportadora, setTransportadora] = useState('')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'link' | 'cartao'>('pix')
  const [origem, setOrigem] = useState<'whatsapp_local' | 'whatsapp_correio'>('whatsapp_local')
  const [isMimo, setIsMimo] = useState(false)
  const [qtdEmbrulhos, setQtdEmbrulhos] = useState(1)
  const [parceliaDesconto, setParceliaDesconto] = useState(false)
  const [qtdImasManual, setQtdImasManual] = useState<Record<string, string>>({})
  // Chaveiro
  const [qtdChaveiroSem, setQtdChaveiroSem] = useState(0)
  const [qtdChaveiroComEsp, setQtdChaveiroComEsp] = useState(0)
  const [custoPorPlaca, setCustoPorPlaca] = useState(0)

  const subtotal = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const descontoParc = parceliaDesconto ? Math.round(subtotal * 0.10 * 100) / 100 : 0
  const descontoManual = parseFloat(desconto) || 0
  const descontoValor = descontoParc + descontoManual
  const freteVal = parseFloat(freteValor) || 0
  const total = Math.max(0, subtotal - descontoValor + freteVal)
  const valorFinal = isMimo ? 0 : total
  const valorRecebido = isMimo ? 0 : total

  // Quantidades
  const qtdImasTotal = itens.reduce((s, i) => {
    const qtdItem = i.qtd_imas > 0 ? i.qtd_imas : (parseInt(qtdImasManual[i.produto_id] || '0') || 0)
    return s + qtdItem * i.quantidade
  }, 0)
  const qtdChaveiroTotal = qtdChaveiroSem + qtdChaveiroComEsp
  const qtdTotalPedido   = qtdImasTotal + qtdChaveiroTotal
  const tipoPedido = qtdImasTotal > 0 && qtdChaveiroTotal > 0 ? 'misto'
    : qtdChaveiroTotal > 0 ? 'chaveiro' : 'ima'

  // Custos de material
  const r2 = (v: number) => Math.round(v * 100) / 100
  const n  = Math.max(1, qtdEmbrulhos)
  const custo_imas_mat    = r2(qtdImasTotal * configMateriais.ima_custo)
  const custoPorChaveiro  = custoPorPlaca + (configMateriais.argola_custo || 0)
  const custoPorChavCom   = custoPorChaveiro + (configMateriais.espelho_custo || 0)
  const custo_chaveiro_mat= r2(qtdChaveiroSem * custoPorChaveiro + qtdChaveiroComEsp * custoPorChavCom)

  // Embalagem compartilhada (baseada no total de peças)
  const custo_saquinhos  = qtdTotalPedido > 0 ? r2(Math.ceil(qtdTotalPedido / 4) * configMateriais.saquinho_custo) : 0
  const custo_caixa      = qtdTotalPedido > 0 ? r2(n * configMateriais.caixa_custo) : 0
  const custo_envelope   = qtdTotalPedido > 0 && !!transportadora ? r2(configMateriais.envelope_custo) : 0
  const custo_papel_seda = qtdTotalPedido > 0 ? r2(n * configMateriais.papel_seda_custo) : 0
  const custo_cartao     = qtdTotalPedido > 0 ? r2(n * configMateriais.cartao_custo) : 0
  const custo_adesivo    = qtdTotalPedido > 0 ? r2(n * (configMateriais.adesivo_caixa_custo || 0)) : 0
  const custo_lacre      = qtdTotalPedido > 0 ? r2(n * (configMateriais.lacre_caixa_custo || 0)) : 0
  const custo_total_pedido = r2(custo_imas_mat + custo_chaveiro_mat + custo_saquinhos + custo_caixa + custo_envelope + custo_papel_seda + custo_cartao + custo_adesivo + custo_lacre)
  const lucroReal = isMimo ? -custo_total_pedido : valorRecebido - custo_total_pedido

  // Mantém custos compatíveis com exibição de ímãs (backward compat)
  const custos = calcularCustosPedido(qtdImasTotal, configMateriais, qtdEmbrulhos, !!transportadora)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const eid = usuario!.empresa_id

      const [{ data: c }, { data: p }, { data: cfg }, { data: placasIns }] = await Promise.all([
        supabase.from('clientes').select('id, nome, whatsapp, tipo').eq('empresa_id', eid).order('nome'),
        supabase.from('produtos').select('id, nome, preco_venda, preco_liquido, qtd_imas, estoque').eq('empresa_id', eid).eq('ativo', true).order('nome'),
        supabase.from('configuracoes_materiais').select('*').eq('empresa_id', eid).single(),
        supabase.from('insumos').select('custo_unitario').eq('empresa_id', eid).in('tipo', ['placa_plastico', 'placa_metal', 'plastico_protecao']),
      ])

      setClientes(c || [])
      setProdutos(p || [])

      const somaPlacas = (placasIns || []).reduce((s: number, p: any) => s + Number(p.custo_unitario || 0), 0)
      setCustoPorPlaca(somaPlacas)

      if (cfg) {
        setConfigMateriais({
          ima_custo:          Number(cfg.ima_custo),
          argola_custo:       Number(cfg.argola_custo || 0.38),
          espelho_custo:      Number(cfg.espelho_custo || 0.66),
          caixa_custo:        Number(cfg.caixa_custo),
          saquinho_custo:     Number(cfg.saquinho_custo),
          envelope_custo:     Number(cfg.envelope_custo),
          papel_seda_custo:   Number(cfg.papel_seda_custo),
          cartao_custo:       Number(cfg.cartao_custo),
          adesivo_caixa_custo:Number(cfg.adesivo_caixa_custo || 0.32),
          lacre_caixa_custo:  Number(cfg.lacre_caixa_custo || 0.27),
        })
      }
    }
    carregar()
  }, [])

  function selecionarCliente(c: any) {
    setClienteSelecionado(c)
    setMostrarClientes(false)
    setBuscaCliente('')
    if (c.tipo === 'mimo') {
      setIsMimo(true)
    } else {
      setIsMimo(false)
    }
    if (c.tipo !== 'parceria') {
      setQtdEmbrulhos(1)
      setParceliaDesconto(false)
    }
  }

  function adicionarProduto(p: any) {
    const existe = itens.find(i => i.produto_id === p.id)
    if (existe) {
      setItens(itens.map(i => i.produto_id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i))
    } else {
      setItens([...itens, {
        produto_id: p.id,
        nome: p.nome,
        preco_unitario: p.preco_venda,
        preco_liquido: p.preco_liquido || p.preco_venda,
        quantidade: 1,
        qtd_imas: p.qtd_imas || 0,
      }])
    }
    setMostrarProdutos(false)
    setBuscaProduto('')
  }

  function removerItem(produto_id: string) {
    setItens(itens.filter(i => i.produto_id !== produto_id))
  }

  function alterarQtd(produto_id: string, qtd: number) {
    if (qtd <= 0) return removerItem(produto_id)
    setItens(itens.map(i => i.produto_id === produto_id ? { ...i, quantidade: qtd } : i))
  }

  function alterarPreco(produto_id: string, preco: number) {
    setItens(itens.map(i => i.produto_id === produto_id ? { ...i, preco_unitario: preco } : i))
  }

  async function salvar() {
    if (!clienteSelecionado) return alert('Selecione um cliente')
    if (itens.length === 0 && qtdTotalPedido === 0) return alert('Adicione pelo menos um produto ou informe a quantidade de chaveiros')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase
      .from('usuarios').select('empresa_id').eq('id', user!.id).single()

    const { data: pedido, error } = await supabase.from('pedidos').insert({
      empresa_id: usuario!.empresa_id,
      cliente_id: clienteSelecionado.id,
      status,
      origem,
      tipo: isMimo ? 'mimo' : 'venda',
      tipo_pedido: tipoPedido,
      data_entrega: dataEntrega || null,
      observacoes: observacoes || null,
      subtotal: isMimo ? 0 : subtotal,
      desconto: isMimo ? 0 : descontoValor,
      frete_valor: isMimo ? 0 : freteVal,
      transportadora: transportadora || null,
      prazo_entrega: prazoEntrega || null,
      valor_total: valorFinal,
      forma_pagamento: isMimo ? null : formaPagamento,
      valor_recebido: valorRecebido,
      qtd_embrulhos: qtdEmbrulhos,
      // Ímãs
      qtd_imas: qtdImasTotal,
      custo_imas: custo_imas_mat,
      custo_saquinhos,
      custo_caixa,
      custo_envelope,
      custo_papel_seda,
      custo_cartao,
      custo_total_pedido,
      lucro_real: lucroReal,
      // Chaveiros
      qtd_chaveiro_sem_espelho: qtdChaveiroSem,
      qtd_chaveiro_com_espelho: qtdChaveiroComEsp,
    }).select().single()

    if (error || !pedido) {
      alert('Erro ao criar pedido: ' + error?.message)
      setLoading(false)
      return
    }

    if (itens.length > 0) {
      const itensData = itens.map(i => ({
        pedido_id: pedido.id,
        produto_id: i.produto_id,
        nome_produto: i.nome,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        subtotal: i.preco_unitario * i.quantidade,
      }))
      await supabase.from('itens_pedido').insert(itensData)
    }

    // Cria pasta no Google Drive automaticamente
    try {
      const driveRes = await fetch('/api/drive/criar-pasta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCliente: clienteSelecionado.nome,
          numeroPedido: pedido.numero,
        }),
      })
      const driveData = await driveRes.json()
      if (driveData.link && driveData.folderId) {
        await supabase.from('pedidos').update({
          link_pasta_drive: driveData.link,
          pasta_drive_id: driveData.folderId,
        }).eq('id', pedido.id)
      }
    } catch {
      // Drive não configurado ou erro — continua sem o link
    }

    // Baixa automática de estoque
    if (status !== 'orcamento' && qtdTotalPedido > 0) {
      await descontarEstoque(
        supabase,
        usuario!.empresa_id,
        qtdImasTotal,
        12,
        pedido.id,
        qtdChaveiroSem,
        qtdChaveiroComEsp,
      )
    }

    router.push(`/pedidos/${pedido.id}`)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  )
  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  )

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const temImasManual = itens.some(i => i.qtd_imas === 0)

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/pedidos" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Novo Pedido</h1>
      </div>

      {/* Toggle Mimo */}
      <button
        onClick={() => setIsMimo(!isMimo)}
        className={`w-full flex items-center justify-between rounded-2xl border p-4 mb-4 transition-all ${
          isMimo ? 'bg-pink-50 border-pink-300' : 'bg-white border-gray-100 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isMimo ? 'bg-pink-100' : 'bg-gray-100'}`}>
            <Gift size={18} className={isMimo ? 'text-pink-500' : 'text-gray-400'} />
          </div>
          <div className="text-left">
            <p className={`text-sm font-semibold ${isMimo ? 'text-pink-700' : 'text-gray-700'}`}>
              {isMimo ? 'Mimo ativado' : 'É um mimo / brinde?'}
            </p>
            <p className="text-xs text-gray-400">Desconta insumos, não entra no caixa</p>
          </div>
        </div>
        <div className={`w-12 h-6 rounded-full transition-all ${isMimo ? 'bg-pink-500' : 'bg-gray-200'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-all`} style={{ marginLeft: isMimo ? '26px' : '2px' }} />
        </div>
      </button>

      {/* Origem do pedido */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Origem do pedido</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setOrigem('whatsapp_local')}
            className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${origem === 'whatsapp_local' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            WhatsApp · Local
          </button>
          <button onClick={() => setOrigem('whatsapp_correio')}
            className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${origem === 'whatsapp_correio' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500'}`}>
            WhatsApp · Correio
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Status inicial</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'aguardando_fotos', label: '🟡 Aguardando Fotos', cls: 'bg-yellow-500' },
            { value: 'orcamento', label: 'Orçamento', cls: 'bg-orange-500' },
            { value: 'producao', label: '🟣 Em Produção', cls: 'bg-purple-500' },
          ].map(s => (
            <button key={s.value} onClick={() => setStatus(s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${status === s.value ? `${s.cls} text-white` : 'bg-gray-100 text-gray-600'}`}>
              {s.label}
            </button>
          ))}
        </div>
        {status === 'aguardando_fotos' && (
          <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2 mt-2">
            📁 Uma pasta no Google Drive será criada automaticamente para o cliente enviar as fotos.
          </p>
        )}
      </div>

      {/* Forma de Pagamento */}
      {!isMimo && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento *</label>
        <div className="grid grid-cols-3 gap-2">
          {[['pix','Pix','green'],['link','Link','purple'],['cartao','Cartao','blue']].map(([v,l,c]) => (
            <button key={v} onClick={() => setFormaPagamento(v as any)}
              className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${formaPagamento === v ? `border-${c}-500 bg-${c}-50 text-${c}-700` : 'border-gray-200 bg-white text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>}

      {/* Cliente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Cliente *</p>
        {clienteSelecionado ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-bold text-xs">{clienteSelecionado.nome.slice(0,2).toUpperCase()}</span>
              </div>
              <span className="font-medium text-gray-900">{clienteSelecionado.nome}</span>
            </div>
            <button onClick={() => setClienteSelecionado(null)} className="text-sm text-gray-400 underline">Trocar</button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="text" value={buscaCliente}
                onChange={e => { setBuscaCliente(e.target.value); setMostrarClientes(true) }}
                onFocus={() => setMostrarClientes(true)}
                placeholder="Buscar cliente..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {mostrarClientes && clientesFiltrados.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {clientesFiltrados.map(c => (
                  <button key={c.id} onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    {c.nome}
                  </button>
                ))}
              </div>
            )}
            {clientes.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Nenhum cliente. <Link href="/clientes/novo" className="text-green-600 underline">Cadastrar cliente</Link>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Parceria */}
      {clienteSelecionado?.tipo === 'parceria' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center"><span className="text-base">🤝</span></div>
            <p className="text-sm font-bold text-blue-800">Beneficio da Parceria</p>
            <p className="text-xs text-gray-400 ml-1">escolha um</p>
          </div>
          <div className="space-y-2">
            <button onClick={() => { setParceliaDesconto(false); setQtdEmbrulhos(q => q === 1 ? 2 : q) }}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${!parceliaDesconto ? 'border-blue-400 bg-white' : 'border-transparent bg-white/60'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Embrulhos separados</p>
                  <p className="text-xs text-gray-400">Cada pacote: caixinha + cartao + papel</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!parceliaDesconto ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                  {!parceliaDesconto && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
              {!parceliaDesconto && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500 flex-1">Quantos embrulhos?</span>
                  <button onClick={e => { e.stopPropagation(); setQtdEmbrulhos(q => Math.max(1, q - 1)) }}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600">−</button>
                  <span className="w-6 text-center font-bold text-gray-900">{qtdEmbrulhos}</span>
                  <button onClick={e => { e.stopPropagation(); setQtdEmbrulhos(q => q + 1) }}
                    className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-700">+</button>
                </div>
              )}
            </button>
            <button onClick={() => { setParceliaDesconto(true); setQtdEmbrulhos(1) }}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${parceliaDesconto ? 'border-green-400 bg-white' : 'border-transparent bg-white/60'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Desconto 10%</p>
                  <p className="text-xs text-gray-400">{parceliaDesconto && subtotal > 0 ? `- R$ ${descontoParc.toFixed(2).replace('.',',')} no total` : 'Desconto aplicado no valor da venda'}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${parceliaDesconto ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                  {parceliaDesconto && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Produtos (ímãs) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">🧲 Ímãs — Produtos</p>
          <button onClick={() => setMostrarProdutos(!mostrarProdutos)} className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <Plus size={16} /> Adicionar
          </button>
        </div>
        {mostrarProdutos && (
          <div className="mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input type="text" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)}
                placeholder="Buscar produto..." autoFocus
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {produtosFiltrados.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {produtosFiltrados.map(p => (
                  <button key={p.id} onClick={() => adicionarProduto(p)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between">
                    <span>{p.nome}</span>
                    <span className="text-green-600 font-medium">{fmt(p.preco_venda)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {itens.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum produto adicionado</p>
        ) : (
          <div className="space-y-3">
            {itens.map(item => (
              <div key={item.produto_id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-gray-900">{item.nome}</p>
                  <button onClick={() => removerItem(item.produto_id)}><Trash2 size={15} className="text-red-400" /></button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => alterarQtd(item.produto_id, item.quantidade - 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold">−</button>
                    <span className="w-8 text-center font-semibold text-sm">{item.quantidade}</span>
                    <button onClick={() => alterarQtd(item.produto_id, item.quantidade + 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold">+</button>
                  </div>
                  <span className="text-xs text-gray-400">×</span>
                  <input type="number" value={item.preco_unitario}
                    onChange={e => alterarPreco(item.produto_id, parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <span className="text-sm font-semibold text-gray-900 ml-auto">{fmt(item.preco_unitario * item.quantidade)}</span>
                </div>
                {item.qtd_imas === 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-orange-600">📸 Qtd ímãs (personalizado):</span>
                    <input type="number" min="0" value={qtdImasManual[item.produto_id] || ''}
                      onChange={e => setQtdImasManual(prev => ({ ...prev, [item.produto_id]: e.target.value }))}
                      placeholder="0"
                      className="w-16 border border-orange-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chaveiro */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-3">🔑 Chaveiro</p>
        <div className="space-y-3">
          {/* Sem espelho */}
          <div className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Sem espelho</p>
              <p className="text-xs text-gray-400">{fmt(custoPorChaveiro)}/un de custo</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQtdChaveiroSem(q => Math.max(0, q - 1))}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600">−</button>
              <span className="w-8 text-center font-bold text-gray-900">{qtdChaveiroSem}</span>
              <button onClick={() => setQtdChaveiroSem(q => q + 1)}
                className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center font-bold text-amber-700">+</button>
            </div>
          </div>
          {/* Com espelho */}
          <div className="flex items-center justify-between border border-gray-100 rounded-xl p-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Com espelho</p>
              <p className="text-xs text-gray-400">{fmt(custoPorChavCom)}/un de custo</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQtdChaveiroComEsp(q => Math.max(0, q - 1))}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-600">−</button>
              <span className="w-8 text-center font-bold text-gray-900">{qtdChaveiroComEsp}</span>
              <button onClick={() => setQtdChaveiroComEsp(q => q + 1)}
                className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center font-bold text-amber-700">+</button>
            </div>
          </div>
        </div>
        {qtdChaveiroTotal > 0 && (
          <div className="mt-3 bg-amber-50 rounded-xl px-3 py-2 flex justify-between">
            <p className="text-xs font-semibold text-amber-700">{qtdChaveiroTotal} chaveiro{qtdChaveiroTotal > 1 ? 's' : ''}</p>
            <p className="text-xs font-bold text-amber-800">{fmt(custo_chaveiro_mat)} de material</p>
          </div>
        )}
      </div>

      {/* Tipo do pedido */}
      {qtdTotalPedido > 0 && (
        <div className={`rounded-xl px-4 py-2 mb-4 text-xs font-semibold text-center ${
          tipoPedido === 'misto' ? 'bg-purple-100 text-purple-700' :
          tipoPedido === 'chaveiro' ? 'bg-amber-100 text-amber-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {tipoPedido === 'misto' ? '🔀 Pedido Misto — ímãs + chaveiros' :
           tipoPedido === 'chaveiro' ? '🔑 Pedido de Chaveiro' :
           '🧲 Pedido de Ímãs'}
        </div>
      )}

      {/* Data e observações */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de entrega</label>
          <input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Desconto (R$)</label>
          <input type="number" value={desconto} onChange={e => setDesconto(e.target.value)}
            placeholder="0,00" step="0.01" min="0"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Frete</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Transportadora</label>
              <input type="text" value={transportadora} onChange={e => setTransportadora(e.target.value)}
                placeholder="Ex: Correios, Jadlog, Shopee..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
                <input type="number" value={freteValor} onChange={e => setFreteValor(e.target.value)}
                  placeholder="0,00" step="0.01" min="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prazo</label>
                <input type="text" value={prazoEntrega} onChange={e => setPrazoEntrega(e.target.value)}
                  placeholder="Ex: 3-5 dias"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
            placeholder="Instruções especiais, detalhes do pedido..." rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        </div>
      </div>

      {/* Total + Custos + Lucro */}
      {(itens.length > 0 || qtdChaveiroTotal > 0) && (
        <>
          {isMimo && (
            <div className="bg-pink-500 rounded-2xl p-4 mb-3 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Gift size={18} />
                <span className="font-semibold">Mimo / Brinde</span>
              </div>
              <p className="text-sm text-pink-100">Esse pedido nao vai entrar no caixa. Os insumos serao descontados do estoque.</p>
            </div>
          )}
          {!isMimo && (
            <div className="bg-green-600 rounded-2xl p-4 mb-3 text-white">
              <div className="flex justify-between text-sm text-green-200 mb-1">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {descontoValor > 0 && (
                <div className="flex justify-between text-sm text-green-200 mb-1">
                  <span>Desconto</span><span>- {fmt(descontoValor)}</span>
                </div>
              )}
              {freteVal > 0 && (
                <div className="flex justify-between text-sm text-green-200 mb-1">
                  <span>Frete</span><span>+ {fmt(freteVal)}</span>
                </div>
              )}
              <div className="border-t border-green-500 mt-2 pt-2 flex justify-between items-center mb-2">
                <span className="font-medium">Valor da Venda</span>
                <span className="text-2xl font-bold">{fmt(total)}</span>
              </div>
              <div className={`rounded-xl px-3 py-2 flex justify-between items-center ${
                formaPagamento === 'pix' ? 'bg-green-600' : formaPagamento === 'cartao' ? 'bg-blue-600' : 'bg-purple-600'
              }`}>
                <span className="text-sm font-medium text-white">
                  {formaPagamento === 'pix' ? 'Pix' : formaPagamento === 'cartao' ? 'Cartao' : 'Link'}
                </span>
                <span className="text-lg font-bold text-white">{fmt(valorRecebido)}</span>
              </div>
            </div>
          )}

          {/* Custos de Material */}
          {qtdTotalPedido > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                📦 Custo de Material ({qtdTotalPedido} peça{qtdTotalPedido > 1 ? 's' : ''})
              </p>
              <div className="space-y-1.5">
                {qtdImasTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ímãs ({qtdImasTotal}×)</span>
                    <span className="text-gray-700">{fmt(custo_imas_mat)}</span>
                  </div>
                )}
                {qtdChaveiroTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Chaveiros ({qtdChaveiroTotal}×)</span>
                    <span className="text-gray-700">{fmt(custo_chaveiro_mat)}</span>
                  </div>
                )}
                {[
                  { label: 'Saquinhos', val: custo_saquinhos },
                  { label: 'Caixa', val: custo_caixa },
                  { label: 'Envelope', val: custo_envelope },
                  { label: 'Papel Seda', val: custo_papel_seda },
                  { label: 'Cartão Reviva', val: custo_cartao },
                ].map(({ label, val }) => val > 0 && (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-700">{fmt(val)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-sm">
                  <span className="text-gray-700">Total Materiais</span>
                  <span className="text-orange-600">{fmt(custo_total_pedido)}</span>
                </div>
              </div>
              <div className={`mt-3 rounded-xl px-3 py-2.5 flex justify-between items-center ${lucroReal >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <span className={`text-sm font-semibold ${lucroReal >= 0 ? 'text-green-700' : 'text-red-600'}`}>💖 Lucro Real</span>
                <span className={`text-lg font-bold ${lucroReal >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(lucroReal)}</span>
              </div>
            </div>
          )}

          {temImasManual && qtdImasTotal === 0 && qtdChaveiroTotal === 0 && (
            <div className="bg-orange-50 rounded-xl p-3 mb-3 border border-orange-200">
              <p className="text-xs text-orange-700">
                ⚠️ Informe a quantidade de ímãs nos produtos personalizados para calcular o custo.
              </p>
            </div>
          )}
        </>
      )}

      <div className="pb-24">
        <button onClick={salvar} disabled={loading}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-all">
          {loading ? 'Salvando...' : 'Criar Pedido'}
        </button>
      </div>
    </div>
  )
}
