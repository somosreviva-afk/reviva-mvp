export const INSUMOS_PADRAO = [
  // 4 componentes do ímã — rastreados separadamente, custo compartilhado (R$/conjunto)
  { tipo: 'ima_magnetico', nome: 'Ímã Magnético', unidade: 'unidade', estoque_minimo: 50 },
  { tipo: 'placa_plastico', nome: 'Placa de Plástico', unidade: 'unidade', estoque_minimo: 50 },
  { tipo: 'placa_metal', nome: 'Placa de Metal', unidade: 'unidade', estoque_minimo: 50 },
  { tipo: 'plastico_protecao', nome: 'Plástico de Proteção', unidade: 'unidade', estoque_minimo: 50 },
  // Embalagem
  { tipo: 'caixa', nome: 'Caixa', unidade: 'unidade', estoque_minimo: 20 },
  { tipo: 'saquinho', nome: 'Saquinho', unidade: 'unidade', estoque_minimo: 25 },
  { tipo: 'envelope', nome: 'Envelope', unidade: 'unidade', estoque_minimo: 20 },
  { tipo: 'papel_seda', nome: 'Papel Seda', unidade: 'unidade', estoque_minimo: 20 },
  { tipo: 'cartao', nome: 'Cartão Reviva', unidade: 'unidade', estoque_minimo: 20 },
  { tipo: 'folha_impressao', nome: 'Folha de Impressão', unidade: 'folha', estoque_minimo: 10 },
]

// Os 4 tipos do ímã são sempre comprados juntos como um conjunto
export const TIPOS_IMA = ['ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao']

// Tipo → campo de custo em configuracoes_materiais
// Para ímãs: custo_unitario no lote = custo por conjunto de 4 peças (= ima_custo)
export const TIPO_PARA_CONFIG: Record<string, string> = {
  ima_magnetico: 'ima_custo',
  placa_plastico: 'ima_custo',
  placa_metal: 'ima_custo',
  plastico_protecao: 'ima_custo',
  caixa: 'caixa_custo',
  saquinho: 'saquinho_custo',
  envelope: 'envelope_custo',
  papel_seda: 'papel_seda_custo',
  cartao: 'cartao_custo',
  folha_impressao: 'impressao_valor_folha',
}

export function calcularConsumo(qtdImas: number, fotosPerFolha: number = 12): Record<string, number> {
  if (qtdImas <= 0) return {}
  return {
    // 1 de cada componente por ímã produzido
    ima_magnetico: qtdImas,
    placa_plastico: qtdImas,
    placa_metal: qtdImas,
    plastico_protecao: qtdImas,
    folha_impressao: qtdImas / fotosPerFolha,
    saquinho: Math.ceil(qtdImas / 4),
    caixa: 1,
    envelope: 1,
    papel_seda: qtdImas <= 12 ? 1 : 2,
    cartao: 1,
  }
}

export async function garantirInsumos(supabase: any, empresaId: string) {
  const { data: existentes } = await supabase
    .from('insumos')
    .select('tipo')
    .eq('empresa_id', empresaId)

  const tiposExistentes = new Set((existentes || []).map((i: any) => i.tipo))
  const novos = INSUMOS_PADRAO.filter(i => !tiposExistentes.has(i.tipo))

  if (novos.length > 0) {
    await supabase.from('insumos').insert(
      novos.map(i => ({ ...i, empresa_id: empresaId }))
    )
  }
}

// Quando o lote ativo esgota, ativa o próximo pendente e atualiza o custo automaticamente
async function ativarProximoLote(
  supabase: any,
  empresaId: string,
  insumoId: string,
  insumoTipo: string
) {
  const { data: proximo } = await supabase
    .from('lotes_estoque')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('insumo_id', insumoId)
    .eq('status', 'pendente')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!proximo) return

  // Ativa o próximo lote
  await supabase
    .from('lotes_estoque')
    .update({ status: 'ativo', updated_at: new Date().toISOString() })
    .eq('id', proximo.id)

  if (proximo.custo_unitario != null) {
    // Atualiza custo_unitario no insumo
    await supabase
      .from('insumos')
      .update({ custo_unitario: proximo.custo_unitario, updated_at: new Date().toISOString() })
      .eq('id', insumoId)

    // Atualiza custo em configuracoes_materiais
    const campoConfig = TIPO_PARA_CONFIG[insumoTipo]
    if (campoConfig) {
      await supabase
        .from('configuracoes_materiais')
        .update({ [campoConfig]: Number(proximo.custo_unitario) })
        .eq('empresa_id', empresaId)
    }
  }
}

export async function descontarEstoque(
  supabase: any,
  empresaId: string,
  qtdImas: number,
  fotosPerFolha: number,
  pedidoId: string
) {
  if (qtdImas <= 0) return

  const { data: insumos } = await supabase
    .from('insumos')
    .select('*')
    .eq('empresa_id', empresaId)

  if (!insumos || insumos.length === 0) return

  const insumoMap: Record<string, any> = {}
  insumos.forEach((i: any) => { insumoMap[i.tipo] = i })

  // Busca lotes ativos de todos os insumos
  const { data: lotesAtivos } = await supabase
    .from('lotes_estoque')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')

  const loteMap: Record<string, any> = {} // insumo_id → lote ativo
  ;(lotesAtivos || []).forEach((l: any) => { loteMap[l.insumo_id] = l })

  const consumo = calcularConsumo(qtdImas, fotosPerFolha)
  const movimentacoes: any[] = []
  const hoje = new Date().toISOString().split('T')[0]

  for (const [tipo, qtd] of Object.entries(consumo)) {
    const insumo = insumoMap[tipo]
    if (!insumo || qtd <= 0) continue

    movimentacoes.push({
      empresa_id: empresaId,
      insumo_id: insumo.id,
      tipo: 'saida',
      quantidade: Number(qtd.toFixed(3)),
      pedido_id: pedidoId,
      observacoes: 'Consumo automático — pedido',
      data: hoje,
    })

    // Atualiza quantidade total do insumo
    const novaQtd = Math.max(0, Number(insumo.quantidade) - qtd)
    await supabase
      .from('insumos')
      .update({ quantidade: Number(novaQtd.toFixed(3)), updated_at: new Date().toISOString() })
      .eq('id', insumo.id)

    // Gerencia lote ativo (FIFO)
    const lote = loteMap[insumo.id]
    if (lote) {
      const novaQtdLote = Number(lote.quantidade_restante) - qtd
      if (novaQtdLote <= 0) {
        // Lote esgotado — ativa o próximo
        await supabase
          .from('lotes_estoque')
          .update({ status: 'esgotado', quantidade_restante: 0, updated_at: new Date().toISOString() })
          .eq('id', lote.id)
        await ativarProximoLote(supabase, empresaId, insumo.id, insumo.tipo)
      } else {
        // Atualiza quantidade restante no lote
        await supabase
          .from('lotes_estoque')
          .update({ quantidade_restante: Number(novaQtdLote.toFixed(3)), updated_at: new Date().toISOString() })
          .eq('id', lote.id)
      }
    }
  }

  if (movimentacoes.length > 0) {
    await supabase.from('movimentacoes_estoque').insert(movimentacoes)
    await supabase.from('pedidos').update({ estoque_descontado: true }).eq('id', pedidoId)
  }
}
