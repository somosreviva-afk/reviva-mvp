export const INSUMOS_PADRAO = [
  // 4 componentes do ímã
  { tipo: 'ima_magnetico',    nome: 'Ímã Magnético',        unidade: 'unidade', estoque_minimo: 50 },
  { tipo: 'placa_plastico',   nome: 'Placa de Plástico',    unidade: 'unidade', estoque_minimo: 50 },
  { tipo: 'placa_metal',      nome: 'Placa de Metal',        unidade: 'unidade', estoque_minimo: 50 },
  { tipo: 'plastico_protecao',nome: 'Plástico de Proteção', unidade: 'unidade', estoque_minimo: 50 },
  // Componentes exclusivos do chaveiro
  { tipo: 'argola',  nome: 'Argola',  unidade: 'unidade', estoque_minimo: 50 },
  { tipo: 'espelho', nome: 'Espelho', unidade: 'unidade', estoque_minimo: 20 },
  // Embalagem (compartilhada)
  { tipo: 'caixa',          nome: 'Caixa',              unidade: 'unidade', estoque_minimo: 20 },
  { tipo: 'saquinho',       nome: 'Saquinho',           unidade: 'unidade', estoque_minimo: 25 },
  { tipo: 'envelope',       nome: 'Envelope',           unidade: 'unidade', estoque_minimo: 20 },
  { tipo: 'papel_seda',     nome: 'Papel Seda',         unidade: 'unidade', estoque_minimo: 40 },
  { tipo: 'cartao',         nome: 'Cartão Reviva',      unidade: 'unidade', estoque_minimo: 20 },
  { tipo: 'folha_impressao',nome: 'Folha de Impressão', unidade: 'folha',   estoque_minimo: 10 },
  { tipo: 'adesivo_caixa',  nome: 'Adesivo da Caixa',  unidade: 'unidade', estoque_minimo: 20 },
  { tipo: 'lacre_caixa',    nome: 'Lacre da Caixa',    unidade: 'unidade', estoque_minimo: 20 },
]

export const TIPOS_IMA = ['ima_magnetico', 'placa_plastico', 'placa_metal', 'plastico_protecao']
export const TIPOS_CHAVEIRO = ['argola', 'espelho']

// Tipo → campo de custo em configuracoes_materiais
export const TIPO_PARA_CONFIG: Record<string, string> = {
  ima_magnetico:    'ima_custo',
  placa_plastico:   'ima_custo',
  placa_metal:      'ima_custo',
  plastico_protecao:'ima_custo',
  argola:           'argola_custo',
  espelho:          'espelho_custo',
  caixa:            'caixa_custo',
  saquinho:         'saquinho_custo',
  envelope:         'envelope_custo',
  papel_seda:       'papel_seda_custo',
  cartao:           'cartao_custo',
  folha_impressao:  'impressao_valor_folha',
  adesivo_caixa:    'adesivo_caixa_custo',
  lacre_caixa:      'lacre_caixa_custo',
}

// ── Consumo por ímã (mantido para compatibilidade) ────────────────────
export function calcularConsumo(qtdImas: number, fotosPerFolha: number = 12): Record<string, number> {
  if (qtdImas <= 0) return {}
  return {
    ima_magnetico:    qtdImas,
    placa_plastico:   qtdImas,
    placa_metal:      qtdImas,
    plastico_protecao:qtdImas,
    folha_impressao:  qtdImas / fotosPerFolha,
    saquinho:         Math.ceil(qtdImas / 4),
    caixa:            1,
    adesivo_caixa:    1,
    lacre_caixa:      1,
    envelope:         1,
    papel_seda:       qtdImas <= 12 ? 1 : 2,
    cartao:           1,
  }
}

// ── Consumo total: ímãs + chaveiros (pedidos mistos) ─────────────────
export function calcularConsumoTotal(
  qtdImas: number,
  qtdChaveiroSemEspelho: number,
  qtdChaveiroComEspelho: number,
  fotosPerFolha: number = 12
): Record<string, number> {
  const qtdChaveiro = qtdChaveiroSemEspelho + qtdChaveiroComEspelho
  const total = qtdImas + qtdChaveiro
  if (total <= 0) return {}

  const consumo: Record<string, number> = {}

  // Ímã magnético: só para ímãs
  if (qtdImas > 0) consumo.ima_magnetico = qtdImas

  // Placas: compartilhadas entre ímãs e chaveiros
  const qtdPlacas = qtdImas + qtdChaveiro
  consumo.placa_plastico    = qtdPlacas
  consumo.placa_metal       = qtdPlacas
  consumo.plastico_protecao = qtdPlacas

  // Componentes exclusivos do chaveiro
  if (qtdChaveiro > 0)          consumo.argola  = qtdChaveiro
  if (qtdChaveiroComEspelho > 0) consumo.espelho = qtdChaveiroComEspelho

  // Embalagem (baseada no total de peças)
  consumo.folha_impressao = total / fotosPerFolha
  consumo.saquinho        = Math.ceil(total / 4)
  consumo.caixa           = 1
  consumo.adesivo_caixa   = 1
  consumo.lacre_caixa     = 1
  consumo.envelope        = 1
  consumo.papel_seda      = total <= 12 ? 1 : 2
  consumo.cartao          = 1

  return consumo
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

// ima_custo = soma dos custo_unitario dos 4 componentes do ímã
export async function atualizarImaCusto(
  supabase: any,
  empresaId: string,
  insumoIdAtualizado: string,
  novoCusto: number
) {
  const { data: comps } = await supabase
    .from('insumos')
    .select('id, custo_unitario')
    .eq('empresa_id', empresaId)
    .in('tipo', TIPOS_IMA)

  const total = (comps || []).reduce((sum: number, c: any) => {
    const custo = c.id === insumoIdAtualizado ? novoCusto : Number(c.custo_unitario || 0)
    return sum + custo
  }, 0)

  await supabase
    .from('configuracoes_materiais')
    .update({ ima_custo: Number(total.toFixed(4)) })
    .eq('empresa_id', empresaId)
}

// Quando o lote ativo esgota, ativa o próximo pendente e atualiza custo
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

  await supabase
    .from('lotes_estoque')
    .update({ status: 'ativo', updated_at: new Date().toISOString() })
    .eq('id', proximo.id)

  if (proximo.custo_unitario != null) {
    await supabase
      .from('insumos')
      .update({ custo_unitario: proximo.custo_unitario, updated_at: new Date().toISOString() })
      .eq('id', insumoId)

    const campoConfig = TIPO_PARA_CONFIG[insumoTipo]
    if (campoConfig === 'ima_custo') {
      await atualizarImaCusto(supabase, empresaId, insumoId, Number(proximo.custo_unitario))
    } else if (campoConfig) {
      await supabase
        .from('configuracoes_materiais')
        .update({ [campoConfig]: Number(proximo.custo_unitario) })
        .eq('empresa_id', empresaId)
    }
  }
}

// ── Desconta estoque — suporta ímãs, chaveiros e pedidos mistos ───────
export async function descontarEstoque(
  supabase: any,
  empresaId: string,
  qtdImas: number,
  fotosPerFolha: number,
  pedidoId: string,
  qtdChaveiroSemEspelho: number = 0,
  qtdChaveiroComEspelho: number = 0
) {
  const total = qtdImas + qtdChaveiroSemEspelho + qtdChaveiroComEspelho
  if (total <= 0) return

  const { data: insumos } = await supabase
    .from('insumos')
    .select('*')
    .eq('empresa_id', empresaId)

  if (!insumos || insumos.length === 0) return

  const insumoMap: Record<string, any> = {}
  insumos.forEach((i: any) => { insumoMap[i.tipo] = i })

  const { data: lotesAtivos } = await supabase
    .from('lotes_estoque')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('status', 'ativo')

  const loteMap: Record<string, any> = {}
  ;(lotesAtivos || []).forEach((l: any) => { loteMap[l.insumo_id] = l })

  const consumo = calcularConsumoTotal(qtdImas, qtdChaveiroSemEspelho, qtdChaveiroComEspelho, fotosPerFolha)
  const movimentacoes: any[] = []
  const hoje = new Date().toISOString().split('T')[0]

  for (const [tipo, qtd] of Object.entries(consumo)) {
    const insumo = insumoMap[tipo]
    if (!insumo || qtd <= 0) continue

    movimentacoes.push({
      empresa_id: empresaId,
      insumo_id:  insumo.id,
      tipo:       'saida',
      quantidade: Number(qtd.toFixed(3)),
      pedido_id:  pedidoId,
      observacoes:'Consumo automático — pedido',
      data:       hoje,
    })

    const novaQtd = Math.max(0, Number(insumo.quantidade) - qtd)
    await supabase
      .from('insumos')
      .update({ quantidade: Number(novaQtd.toFixed(3)), updated_at: new Date().toISOString() })
      .eq('id', insumo.id)

    const lote = loteMap[insumo.id]
    if (lote) {
      const novaQtdLote = Number(lote.quantidade_restante) - qtd
      if (novaQtdLote <= 0) {
        await supabase
          .from('lotes_estoque')
          .update({ status: 'esgotado', quantidade_restante: 0, updated_at: new Date().toISOString() })
          .eq('id', lote.id)
        await ativarProximoLote(supabase, empresaId, insumo.id, insumo.tipo)
      } else {
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
