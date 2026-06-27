import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularConsumo } from '@/lib/utils/estoque'

// Devolve ao estoque tudo que foi consumido por um pedido
export async function POST(req: NextRequest) {
  try {
    const { pedidoId } = await req.json()
    if (!pedidoId) return NextResponse.json({ error: 'pedidoId obrigatório' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id, empresa_id, qtd_imas, estoque_descontado, configuracoes_materiais(impressao_fotos_por_folha)')
      .eq('id', pedidoId)
      .single()

    if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (!pedido.estoque_descontado) return NextResponse.json({ ok: true, msg: 'Estoque não havia sido descontado' })

    const qtdImas = Number(pedido.qtd_imas || 0)
    if (qtdImas <= 0) return NextResponse.json({ ok: true, msg: 'Pedido sem ímãs — nada a restaurar' })

    const fotosPerFolha = 12
    const consumo = calcularConsumo(qtdImas, fotosPerFolha)

    const { data: insumos } = await supabase
      .from('insumos')
      .select('*')
      .eq('empresa_id', pedido.empresa_id)

    if (!insumos) return NextResponse.json({ ok: true })

    const insumoMap: Record<string, any> = {}
    insumos.forEach((i: any) => { insumoMap[i.tipo] = i })

    const hoje = new Date().toISOString().split('T')[0]
    const movimentacoes: any[] = []

    for (const [tipo, qtd] of Object.entries(consumo)) {
      const insumo = insumoMap[tipo]
      if (!insumo || qtd <= 0) continue

      const novaQtd = Number(insumo.quantidade) + qtd
      await supabase
        .from('insumos')
        .update({ quantidade: Number(novaQtd.toFixed(3)), updated_at: new Date().toISOString() })
        .eq('id', insumo.id)

      // Devolve ao lote ativo se existir
      const { data: loteAtivo } = await supabase
        .from('lotes_estoque')
        .select('*')
        .eq('empresa_id', pedido.empresa_id)
        .eq('insumo_id', insumo.id)
        .eq('status', 'ativo')
        .maybeSingle()

      if (loteAtivo) {
        await supabase
          .from('lotes_estoque')
          .update({ quantidade_restante: Number((Number(loteAtivo.quantidade_restante) + qtd).toFixed(3)) })
          .eq('id', loteAtivo.id)
      }

      movimentacoes.push({
        empresa_id: pedido.empresa_id,
        insumo_id: insumo.id,
        tipo: 'entrada',
        quantidade: Number(qtd.toFixed(3)),
        pedido_id: pedidoId,
        observacoes: 'Estorno — pedido cancelado/excluído',
        data: hoje,
      })
    }

    if (movimentacoes.length > 0) {
      await supabase.from('movimentacoes_estoque').insert(movimentacoes)
      await supabase.from('pedidos').update({ estoque_descontado: false }).eq('id', pedidoId)
    }

    return NextResponse.json({ ok: true, restaurado: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
