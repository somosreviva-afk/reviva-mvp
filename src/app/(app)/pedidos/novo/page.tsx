'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'
import Link from 'next/link'

interface ItemPedido {
  produto_id: string
  nome: string
  preco_unitario: number
  preco_liquido: number
  quantidade: number
}

export default function NovoPedidoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null)
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [mostrarClientes, setMostrarClientes] = useState(false)
  const [mostrarProdutos, setMostrarProdutos] = useState(false)
  const [dataEntrega, setDataEntrega] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [status, setStatus] = useState('orcamento')
  const [desconto, setDesconto] = useState('')
  const [freteValor, setFreteValor] = useState('')
  const [transportadora, setTransportadora] = useState('')
  const [prazoEntrega, setPrazoEntrega] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'link_pagamento'>('pix')

  const subtotal = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const descontoValor = parseFloat(desconto) || 0
  const freteVal = parseFloat(freteValor) || 0
  const total = Math.max(0, subtotal - descontoValor + freteVal)

  const subtotalLiquido = itens.reduce((s, i) => s + (i.preco_liquido || i.preco_unitario) * i.quantidade, 0)
  const valorRecebido = formaPagamento === 'pix'
    ? total
    : Math.max(0, subtotalLiquido - descontoValor + freteVal)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user!.id).single()

      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from('clientes').select('id, nome, whatsapp').eq('empresa_id', usuario!.empresa_id).order('nome'),
        supabase.from('produtos').select('id, nome, preco_venda, preco_liquido, estoque').eq('empresa_id', usuario!.empresa_id).eq('ativo', true).order('nome'),
      ])
      setClientes(c || [])
      setProdutos(p || [])
    }
    carregar()
  }, [])

  function selecionarCliente(c: any) {
    setClienteSelecionado(c)
    setMostrarClientes(false)
    setBuscaCliente('')
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
        quantidade: 1
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
    if (itens.length === 0) return alert('Adicione pelo menos um produto')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase
      .from('usuarios').select('empresa_id').eq('id', user!.id).single()

    const { data: pedido, error } = await supabase.from('pedidos').insert({
      empresa_id: usuario!.empresa_id,
      cliente_id: clienteSelecionado.id,
      status,
      data_entrega: dataEntrega || null,
      observacoes: observacoes || null,
      subtotal,
      desconto: descontoValor,
      frete_valor: freteVal,
      transportadora: transportadora || null,
      prazo_entrega: prazoEntrega || null,
      valor_total: total,
      forma_pagamento: formaPagamento,
      valor_recebido: valorRecebido,
    }).select().single()

    if (error || !pedido) {
      alert('Erro ao criar pedido: ' + error?.message)
      setLoading(false)
      return
    }

    const itensData = itens.map(i => ({
      pedido_id: pedido.id,
      produto_id: i.produto_id,
      nome_produto: i.nome,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      subtotal: i.preco_unitario * i.quantidade,
    }))

    await supabase.from('itens_pedido').insert(itensData)
    router.push(`/pedidos/${pedido.id}`)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  )
  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  )

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/pedidos" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Novo Pedido</h1>
      </div>

      {/* Status */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Status inicial</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'orcamento', label: 'Orçamento', color: 'orange' },
            { value: 'aprovado', label: 'Aprovado', color: 'blue' },
            { value: 'producao', label: 'Em Produção', color: 'yellow' },
          ].map(s => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                status === s.value
                  ? s.color === 'orange' ? 'bg-orange-500 text-white'
                  : s.color === 'blue' ? 'bg-blue-500 text-white'
                  : 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Forma de Pagamento */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento *</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setFormaPagamento('pix')}
            className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              formaPagamento === 'pix'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            💚 Pix
          </button>
          <button
            onClick={() => setFormaPagamento('link_pagamento')}
            className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
              formaPagamento === 'link_pagamento'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            🔗 Link de Pagamento
          </button>
        </div>
        {formaPagamento === 'link_pagamento' && (
          <p className="text-xs text-purple-600 mt-2 bg-purple-50 rounded-lg px-3 py-2">
            O valor recebido será calculado pelo preço líquido de cada produto (após taxa da plataforma).
          </p>
        )}
      </div>

      {/* Cliente */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Cliente *</p>
        {clienteSelecionado ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-bold text-xs">
                  {clienteSelecionado.nome.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="font-medium text-gray-900">{clienteSelecionado.nome}</span>
            </div>
            <button onClick={() => setClienteSelecionado(null)} className="text-sm text-gray-400 underline">
              Trocar
            </button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                value={buscaCliente}
                onChange={e => { setBuscaCliente(e.target.value); setMostrarClientes(true) }}
                onFocus={() => setMostrarClientes(true)}
                placeholder="Buscar cliente..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {mostrarClientes && clientesFiltrados.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {clientesFiltrados.map(c => (
                  <button
                    key={c.id}
                    onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
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

      {/* Produtos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Produtos *</p>
          <button
            onClick={() => setMostrarProdutos(!mostrarProdutos)}
            className="flex items-center gap-1 text-green-600 text-sm font-medium"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {mostrarProdutos && (
          <div className="mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                type="text"
                value={buscaProduto}
                onChange={e => setBuscaProduto(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
            </div>
            {produtosFiltrados.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {produtosFiltrados.map(p => (
                  <button
                    key={p.id}
                    onClick={() => adicionarProduto(p)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between"
                  >
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
                  <button onClick={() => removerItem(item.produto_id)}>
                    <Trash2 size={15} className="text-red-400" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alterarQtd(item.produto_id, item.quantidade - 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{item.quantidade}</span>
                    <button
                      onClick={() => alterarQtd(item.produto_id, item.quantidade + 1)}
                      className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">×</span>
                  <input
                    type="number"
                    value={item.preco_unitario}
                    onChange={e => alterarPreco(item.produto_id, parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <span className="text-sm font-semibold text-gray-900 ml-auto">
                    {fmt(item.preco_unitario * item.quantidade)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data e observações */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de entrega</label>
          <input
            type="date"
            value={dataEntrega}
            onChange={e => setDataEntrega(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Desconto (R$)</label>
          <input
            type="number"
            value={desconto}
            onChange={e => setDesconto(e.target.value)}
            placeholder="0,00"
            step="0.01"
            min="0"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Frete</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Transportadora</label>
              <input
                type="text"
                value={transportadora}
                onChange={e => setTransportadora(e.target.value)}
                placeholder="Ex: Correios, Jadlog, Shopee..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
                <input
                  type="number"
                  value={freteValor}
                  onChange={e => setFreteValor(e.target.value)}
                  placeholder="0,00"
                  step="0.01" min="0"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prazo</label>
                <input
                  type="text"
                  value={prazoEntrega}
                  onChange={e => setPrazoEntrega(e.target.value)}
                  placeholder="Ex: 3-5 dias"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
          <textarea
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Instruções especiais, detalhes do pedido..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>
      </div>

      {/* Total */}
      {itens.length > 0 && (
        <div className="bg-green-600 rounded-2xl p-4 mb-4 text-white">
          <div className="flex justify-between text-sm text-green-200 mb-1">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {descontoValor > 0 && (
            <div className="flex justify-between text-sm text-green-200 mb-1">
              <span>Desconto</span>
              <span>- {fmt(descontoValor)}</span>
            </div>
          )}
          {freteVal > 0 && (
            <div className="flex justify-between text-sm text-green-200 mb-1">
              <span>Frete</span>
              <span>+ {fmt(freteVal)}</span>
            </div>
          )}
          <div className="border-t border-green-500 mt-2 pt-2 flex justify-between items-center mb-2">
            <span className="font-medium">Valor da Venda</span>
            <span className="text-2xl font-bold">{fmt(total)}</span>
          </div>
          <div className={`rounded-xl px-3 py-2 flex justify-between items-center ${
            formaPagamento === 'pix' ? 'bg-green-500' : 'bg-purple-600'
          }`}>
            <span className="text-sm font-medium">
              {formaPagamento === 'pix' ? '💚 Valor Recebido (Pix)' : '🔗 Valor Recebido (Link)'}
            </span>
            <span className="text-lg font-bold">{fmt(valorRecebido)}</span>
          </div>
        </div>
      )}

      <div className="pb-24">
        <button
          onClick={salvar}
          disabled={loading}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? 'Salvando...' : 'Criar Pedido'}
        </button>
      </div>
    </div>
  )
}
