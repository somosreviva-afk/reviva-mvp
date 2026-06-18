'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, MessageCircle, ChevronRight, Truck, Pencil, Trash2, FolderOpen, Camera, Package, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER } from '@/lib/utils/formatters'
import { calcularCustosPedido, CONFIG_PADRAO, type ConfigMateriais } from '@/lib/utils/custos'
import { descontarEstoque } from '@/lib/utils/estoque'

export default function PedidoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [pedido, setPedido] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [configMateriais, setConfigMateriais] = useState<ConfigMateriais>(CONFIG_PADRAO)
  const [atualizando, setAtualizando] = useState(false)
  const [rastreio, setRastreio] = useState('')
  const [dataPostagem, setDataPostagem] = useState('')
  const [salvandoEnvio, setSalvandoEnvio] = useState(false)

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
        impressao_valor_folha: Number(cfg.impressao_valor_folha),
        impressao_fotos_por_folha: Number(cfg.impressao_fotos_por_folha),
      })
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [id])

  async function mudarStatus(novoStatus: string) {
    setAtualizando(true)
    const supabase = createClient()
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id)

    // Baixa automática de estoque ao mover para produção
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
    // Auto-muda status para 'enviado' ao cadastrar rastreio
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
    const mensagem =
      `Olá, ${nome}! 💖\n\n` +
      `Seu pedido já foi enviado e está a caminho.\n\n` +
      `Código de rastreio:\n${codigo}\n\n` +
      `Assim você poderá acompanhar toda a entrega. ✨`
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  async function cancelar() {
    if (!confirm('Cancelar este pedido?')) return
    await mudarStatus('cancelado')
  }

  async function excluir() {
    if (!confirm('Excluir este pedido permanentemente? Esta ação não pode ser desfeita.')) return
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
    const mensagem = `Olá ${pedido.clientes.nome}! 👋\n\nSeu pedido #${pedido.numero}:\n${listaItens}${dataEntrega}\n\n*Total: ${formatCurrency(pedido.valor_total)}*\n\nStatus: ${STATUS_LABELS[pedido.status]}`
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

  function enviarSolicitacaoFotos() {
    if (!pedido?.clientes?.whatsapp || !pedido?.link_pasta_drive) return
    const numero = pedido.clientes.whatsapp.replace(/\D/g, '')
    const nome = pedido.clientes.nome
    const link = pedido.link_pasta_drive
    const mensagem =
      `Olá, ${nome}! 💖\n\n` +
      `Recebemos seu pedido e sua pasta exclusiva já foi criada.\n\n` +
      `Para manter a qualidade original das fotos, envie suas imagens diretamente pelo link abaixo:\n\n` +
      `${link}\n\n` +
      `Assim que recebermos as fotos iniciaremos a produção dos seus ímãs personalizados. ✨\n\n` +
      `Qualquer dúvida estou à disposição. 💕`
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

  // Custos salvos no pedido (ou recalcula se ainda não existem)
  const qtdImasPedido = pedido.qtd_imas || 0
  const custosSalvos = qtdImasPedido > 0 ? {
    custo_imas: Number(pedido.custo_imas || 0),
    custo_impressao: Number(pedido.custo_impressao || 0),
    custo_saquinhos: Number(pedido.custo_saquinhos || 0),
    custo_caixa: Number(pedido.custo_caixa || 0),
    custo_envelope: Number(pedido.custo_envelope || 0),
    custo_papel_seda: Number(pedido.custo_papel_seda || 0),
    custo_cartao: Number(pedido.custo_cartao || 0),
    custo_total_pedido: Number(pedido.custo_total_pedido || 0),
  } : null
  const lucroReal = Number(pedido.lucro_real ?? (pedido.valor_recebido ?? pedido.valor_total))

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/pedidos" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Pedido #{pedido.numero}</h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[pedido.status]}`}>
            {STATUS_LABELS[pedido.status]}
          </span>
        </div>
        <Link
          href={`/pedidos/${id}/editar`}
          className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center"
        >
          <Pencil size={16} className="text-blue-600" />
        </Link>
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

      {/* Pasta Google Drive */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={15} className="text-yellow-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pasta do Cliente</p>
        </div>
        {pedido.link_pasta_drive ? (
          <div className="space-y-2">
            <a
              href={pedido.link_pasta_drive}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-3 text-sm font-medium text-yellow-800 active:scale-95 transition-all"
            >
              <FolderOpen size={16} className="text-yellow-600 flex-shrink-0" />
              <span className="flex-1">🔗 Abrir Pasta no Drive</span>
              <ChevronRight size={14} className="text-yellow-500" />
            </a>
            {pedido.clientes?.whatsapp && (
              <button
                onClick={enviarSolicitacaoFotos}
                className="w-full flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-3 text-sm font-medium text-green-800 active:scale-95 transition-all"
              >
                <Camera size={16} className="text-green-600 flex-shrink-0" />
                <span className="flex-1">📲 Enviar Solicitação de Fotos</span>
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Pasta não criada (configure o Google Drive em Configurações)</p>
        )}
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
          <div className="flex justify-between font-bold text-gray-900 mb-3">
            <span>Valor da Venda</span>
            <span className="text-lg">{formatCurrency(pedido.valor_total)}</span>
          </div>
          {pedido.forma_pagamento && (
            <div className={`rounded-xl px-3 py-2.5 flex justify-between items-center ${
              pedido.forma_pagamento === 'pix' ? 'bg-green-50' : 'bg-purple-50'
            }`}>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${
                  pedido.forma_pagamento === 'pix' ? 'text-green-600' : 'text-purple-600'
                }`}>
                  {pedido.forma_pagamento === 'pix' ? '💚 Pix' : '🔗 Link de Pagamento'}
                </p>
                <p className="text-xs text-gray-500">Valor Recebido</p>
              </div>
              <span className={`text-lg font-bold ${
                pedido.forma_pagamento === 'pix' ? 'text-green-700' : 'text-purple-700'
              }`}>
                {formatCurrency(pedido.valor_recebido ?? pedido.valor_total)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Frete — info */}
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
        </div>
      )}

      {/* Envio e Rastreamento */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Package size={15} className="text-blue-500" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Envio e Rastreamento</p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Data de Postagem</p>
            <input
              type="date"
              value={dataPostagem}
              onChange={e => setDataPostagem(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Código de Rastreio</p>
            <input
              type="text"
              value={rastreio}
              onChange={e => setRastreio(e.target.value)}
              placeholder="Ex: BR123456789BR"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={salvarEnvio}
            disabled={salvandoEnvio}
            className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-all"
          >
            {salvandoEnvio ? 'Salvando...' : 'Salvar dados de envio'}
          </button>
        </div>

        {/* Botões de ação — aparecem quando tem código */}
        {(pedido.codigo_rastreio || rastreio) && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <button
              onClick={rastrearPedido}
              className="w-full flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-3 text-sm font-medium text-blue-800 active:scale-95 transition-all"
            >
              <Truck size={16} className="text-blue-600 flex-shrink-0" />
              <span className="flex-1">🚚 Rastrear Pedido</span>
              <ChevronRight size={14} className="text-blue-400" />
            </button>
            {pedido.clientes?.whatsapp && (
              <button
                onClick={informarEnvio}
                className="w-full flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-3 text-sm font-medium text-green-800 active:scale-95 transition-all"
              >
                <MessageCircle size={16} className="text-green-600 flex-shrink-0" />
                <span className="flex-1">📲 Informar Envio ao Cliente</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Custos e Lucro */}
      {custosSalvos && custosSalvos.custo_total_pedido > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            📦 Custo de Material ({qtdImasPedido} ímãs)
          </p>
          <div className="space-y-1.5">
            {[
              { label: 'Ímãs', val: custosSalvos.custo_imas },
              { label: 'Impressão', val: custosSalvos.custo_impressao },
              { label: 'Saquinhos', val: custosSalvos.custo_saquinhos },
              { label: 'Caixa', val: custosSalvos.custo_caixa },
              { label: 'Envelope', val: custosSalvos.custo_envelope },
              { label: 'Papel Seda', val: custosSalvos.custo_papel_seda },
              { label: 'Cartão Reviva', val: custosSalvos.custo_cartao },
            ].map(({ label, val }) => val > 0 && (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-700">{formatCurrency(val)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-sm">
              <span className="text-gray-700">Total Materiais</span>
              <span className="text-orange-600">{formatCurrency(custosSalvos.custo_total_pedido)}</span>
            </div>
          </div>
          <div className={`mt-3 rounded-xl px-3 py-2.5 flex justify-between items-center ${lucroReal >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className={`text-sm font-semibold ${lucroReal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              💖 Lucro Real
            </span>
            <span className={`text-lg font-bold ${lucroReal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatCurrency(lucroReal)}
            </span>
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

      {/* Cancelar / Excluir */}
      <div className="pb-24 space-y-2">
        {pedido.status !== 'cancelado' && pedido.status !== 'entregue' && (
          <button
            onClick={cancelar}
            className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium"
          >
            Cancelar pedido
          </button>
        )}
        <button
          onClick={excluir}
          className="w-full py-3 rounded-xl border border-red-400 bg-red-50 text-red-600 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Trash2 size={15} />
          Excluir pedido
        </button>
      </div>
    </div>
  )
}
