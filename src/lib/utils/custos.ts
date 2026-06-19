export interface ConfigMateriais {
  ima_custo: number
  caixa_custo: number
  saquinho_custo: number
  envelope_custo: number
  papel_seda_custo: number
  cartao_custo: number
  impressao_valor_folha: number
  impressao_fotos_por_folha: number
}

export const CONFIG_PADRAO: ConfigMateriais = {
  ima_custo: 3.00,
  caixa_custo: 1.23,
  saquinho_custo: 0.35,
  envelope_custo: 0.28,
  papel_seda_custo: 0.10,
  cartao_custo: 0.16,
  impressao_valor_folha: 2.00,
  impressao_fotos_por_folha: 12,
}

export interface CustosPedido {
  qtd_imas: number
  custo_imas: number
  custo_impressao: number
  custo_saquinhos: number
  custo_caixa: number
  custo_envelope: number
  custo_papel_seda: number
  custo_cartao: number
  custo_total_pedido: number
}

export function calcularCustosPedido(qtdImas: number, config: ConfigMateriais): CustosPedido {
  if (qtdImas <= 0) {
    return { qtd_imas: 0, custo_imas: 0, custo_impressao: 0, custo_saquinhos: 0, custo_caixa: 0, custo_envelope: 0, custo_papel_seda: 0, custo_cartao: 0, custo_total_pedido: 0 }
  }
  const r2 = (n: number) => Math.round(n * 100) / 100
  // Impressão: paga por folha inteira (não proporcional por foto)
  const folhasUsadas = Math.ceil(qtdImas / config.impressao_fotos_por_folha)
  const custo_imas = r2(qtdImas * config.ima_custo)
  const custo_impressao = r2(folhasUsadas * config.impressao_valor_folha)
  const custo_saquinhos = r2(Math.ceil(qtdImas / 4) * config.saquinho_custo)
  const custo_caixa = r2(config.caixa_custo)
  const custo_envelope = r2(config.envelope_custo)
  const custo_papel_seda = r2((qtdImas <= 12 ? 1 : 2) * config.papel_seda_custo)
  const custo_cartao = r2(config.cartao_custo)
  const custo_total_pedido = r2(custo_imas + custo_impressao + custo_saquinhos + custo_caixa + custo_envelope + custo_papel_seda + custo_cartao)
  return { qtd_imas: qtdImas, custo_imas, custo_impressao, custo_saquinhos, custo_caixa, custo_envelope, custo_papel_seda, custo_cartao, custo_total_pedido }
}
