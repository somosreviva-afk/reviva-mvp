import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularCustosPedido } from '@/lib/utils/custos'
import { descontarEstoque } from '@/lib/utils/estoque'

function mapearFormaPagamento(method: string): 'pix' | 'link' | 'cartao' {
  if (!method) return 'link'
  const m = method.toLowerCase()
  if (m === 'pix') return 'pix'
  if (m.includes('credit') || m.includes('cartao') || m.includes('cartão')) return 'cartao'
  return 'link'
}

export async function POST(req: NextRequest) {
  try {
    // Valida secret token — impede pedidos falsos
    const secret = process.env.NUVEMSHOP_WEBHOOK_SECRET
    if (secret) {
      const tokenRecebido = req.nextUrl.searchParams.get('secret')
        || req.headers.get('x-webhook-secret')
      if (tokenRecebido !== secret) {
        console.warn('Webhook rejeitado: secret inválido')
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
    }

    const body = await req.json()

    // Nuvemshop pode mandar objeto ou array
    const pedidoNuvem = Array.isArray(body) ? body[0] : body

    if (!pedidoNuvem || !pedidoNuvem.customer) {
      return NextResponse.json({ error: 'payload_invalido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Busca empresa (MVP single-tenant: pega a primeira)
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .limit(1)
      .single()

    if (!empresa) {
      return NextResponse.json({ error: 'empresa_nao_encontrada' }, { status: 500 })
    }

    const empresaId = empresa.id

    // Evita pedido duplicado
    const numeroPedidoNuvem = String(pedidoNuvem.number || pedidoNuvem.id)
    const { data: pedidoExistente } = await supabase
      .from('pedidos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('nuvemshop_order_id', numeroPedidoNuvem)
      .maybeSingle()

    if (pedidoExistente) {
      return NextResponse.json({ ok: true, duplicado: true, pedido_id: pedidoExistente.id })
    }

    // ── 1. Upsert cliente ─────────────────────────────────────────
    const nomeCliente = pedidoNuvem.customer.name || 'Cliente'
    const telefone = (pedidoNuvem.customer.phone || '').replace(/\D/g, '')

    let clienteId: string

    if (telefone) {
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('whatsapp', telefone)
        .maybeSingle()

      if (existente) {
        clienteId = existente.id
      } else {
        const { data: novo } = await supabase
          .from('clientes')
          .insert({ empresa_id: empresaId, nome: nomeCliente, whatsapp: telefone, tipo: 'cliente' })
          .select('id')
          .single()
        clienteId = novo!.id
      }
    } else {
      // Sem telefone: cria cliente pelo nome
      const { data: novo } = await supabase
        .from('clientes')
        .insert({ empresa_id: empresaId, nome: nomeCliente, tipo: 'cliente' })
        .select('id')
        .single()
      clienteId = novo!.id
    }

    // ── 2. Mapear produtos ────────────────────────────────────────
    const { data: produtosReviva } = await supabase
      .from('produtos')
      .select('id, nome, preco_venda, qtd_imas')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)

    const produtosNuvem: any[] = pedidoNuvem.products || []
    const itensParaInserir: any[] = []
    let qtdImasTotal = 0

    for (const pn of produtosNuvem) {
      const nomeNuvem = (pn.name || '').toLowerCase().trim()

      // Match por nome (exato → parcial → fallback no primeiro produto)
      const match =
        (produtosReviva || []).find(pr => pr.nome.toLowerCase().trim() === nomeNuvem) ||
        (produtosReviva || []).find(pr =>
          nomeNuvem.includes(pr.nome.toLowerCase().trim()) ||
          pr.nome.toLowerCase().trim().includes(nomeNuvem)
        ) ||
        (produtosReviva || [])[0]

      if (match) {
        const qtd = Number(pn.quantity || 1)
        qtdImasTotal += (match.qtd_imas || 0) * qtd
        itensParaInserir.push({
          produto_id: match.id,
          nome_produto: match.nome,
          quantidade: qtd,
          preco_unitario: Number(pn.unit_price || pn.price || match.preco_venda),
          subtotal: Number(pn.unit_price || pn.price || match.preco_venda) * qtd,
        })
      }
    }

    // ── 3. Config materiais e custos ──────────────────────────────
    const { data: cfg } = await supabase
      .from('configuracoes_materiais')
      .select('*')
      .eq('empresa_id', empresaId)
      .single()

    const configMateriais = {
      ima_custo: Number(cfg?.ima_custo || 0),
      caixa_custo: Number(cfg?.caixa_custo || 0),
      saquinho_custo: Number(cfg?.saquinho_custo || 0),
      envelope_custo: Number(cfg?.envelope_custo || 0),
      papel_seda_custo: Number(cfg?.papel_seda_custo || 0),
      cartao_custo: Number(cfg?.cartao_custo || 0),
      impressao_valor_folha: Number(cfg?.impressao_valor_folha || 0),
      impressao_fotos_por_folha: Number(cfg?.impressao_fotos_por_folha || 12),
    }

    const custos = calcularCustosPedido(qtdImasTotal, configMateriais, 1)

    // ── 4. Dados financeiros do pedido ────────────────────────────
    const formaPagamento = mapearFormaPagamento(
      pedidoNuvem.payment_details?.method || pedidoNuvem.payment_method || ''
    )
    const freteValor = Number(pedidoNuvem.shipping?.price || pedidoNuvem.total_shipping || 0)
    const transportadora = (
      pedidoNuvem.shipping?.method ||
      pedidoNuvem.shipping?.provider ||
      ''
    ).trim()
    const subtotal = Number(pedidoNuvem.subtotal || 0)
    const desconto = Number(pedidoNuvem.discount || 0)
    const valorTotal = Number(pedidoNuvem.total || 0)
    const lucroReal = valorTotal - custos.custo_total_pedido

    // ── 5. Criar pedido ───────────────────────────────────────────
    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos')
      .insert({
        empresa_id: empresaId,
        cliente_id: clienteId,
        nuvemshop_order_id: numeroPedidoNuvem,
        origem: 'nuvemshop',
        status: 'aguardando_fotos',
        tipo: 'venda',
        subtotal,
        desconto,
        frete_valor: freteValor,
        transportadora: transportadora || null,
        valor_total: valorTotal,
        forma_pagamento: formaPagamento,
        valor_recebido: valorTotal,
        qtd_embrulhos: 1,
        qtd_imas: custos.qtd_imas,
        custo_imas: custos.custo_imas,
        custo_impressao: custos.custo_impressao,
        custo_saquinhos: custos.custo_saquinhos,
        custo_caixa: custos.custo_caixa,
        custo_envelope: custos.custo_envelope,
        custo_papel_seda: custos.custo_papel_seda,
        custo_cartao: custos.custo_cartao,
        custo_total_pedido: custos.custo_total_pedido,
        lucro_real: lucroReal,
        observacoes: `Pedido Nuvemshop #${numeroPedidoNuvem}`,
      })
      .select()
      .single()

    if (erroPedido || !pedido) {
      console.error('Erro ao criar pedido:', erroPedido)
      return NextResponse.json({ error: erroPedido?.message }, { status: 500 })
    }

    // ── 6. Itens do pedido ────────────────────────────────────────
    if (itensParaInserir.length > 0) {
      await supabase.from('itens_pedido').insert(
        itensParaInserir.map(i => ({ ...i, pedido_id: pedido.id }))
      )
    }

    // ── 7. Pasta Google Drive ─────────────────────────────────────
    try {
      const baseUrl = 'https://reviva-mvp.vercel.app'
      const driveRes = await fetch(`${baseUrl}/api/drive/criar-pasta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeCliente, numeroPedido: pedido.numero }),
      })
      const driveData = await driveRes.json()
      if (driveData.link && driveData.folderId) {
        await supabase
          .from('pedidos')
          .update({ link_pasta_drive: driveData.link, pasta_drive_id: driveData.folderId })
          .eq('id', pedido.id)
      }
    } catch {
      // Drive não configurado — ignora
    }

    // ── 8. Descontar estoque ──────────────────────────────────────
    if (qtdImasTotal > 0) {
      await descontarEstoque(
        supabase,
        empresaId,
        qtdImasTotal,
        configMateriais.impressao_fotos_por_folha,
        pedido.id
      )
    }

    return NextResponse.json({
      ok: true,
      pedido_id: pedido.id,
      cliente: nomeCliente,
      qtd_imas: qtdImasTotal,
    })
  } catch (err: any) {
    console.error('Webhook Nuvemshop erro:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
