export interface ConfigMateriais {
  ima_custo: number
  caixa_custo: number
  saquinho_custo: number
  envelope_custo: number
  papel_seda_custo: number
  cartao_custo: number
  impressao_valor_folha: number
  impressao_fotos_por_folha: number
  adesivo_caixa_custo: number
  lacre_caixa_custo: number
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
  adesivo_caixa_custo: 0.32,
  lacre_caixa_custo: 0.27,
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
  custo_adesivo_caixa: number
  custo_lacre_caixa: number
  custo_total_pedido: number
}

// qtdEmbrulhos: quantos pacotes separados (padrão 1)
// Ex: Nayara pede 12 ímãs em 4 embrulhos de 3 → qtdEmbrulhos = 4
// Multiplica caixa, cartão e papel seda por qtdEmbrulhos
export function calcularCustosPedido(
  qtdImas: number,
  config: ConfigMateriais,
  qtdEmbrulhos: number = 1
): CustosPedido {
  if (qtdImas <= 0) {
    return { qtd_imas: 0, custo_imas: 0, custo_impressao: 0, custo_saquinhos: 0, custo_caixa: 0, custo_envelope: 0, custo_papel_seda: 0, custo_cartao: 0, custo_adesivo_caixa: 0, custo_lacre_caixa: 0, custo_total_pedido: 0 }
  }
  const n = Math.max(1, qtdEmbrulhos)
  const r2 = (v: number) => Math.round(v * 100) / 100
  const custo_imas = r2(qtdImas * config.ima_custo)
  // Impressao: valor fixo por pedido (independente da quantidade)
  const custo_impressao = r2(config.impressao_valor_folha)
  const custo_saquinhos = r2(Math.ceil(qtdImas / 4) * config.saquinho_custo)
  // Embrulho separado: cada pacote tem sua própria caixa, cartão e papel seda
  const custo_caixa = r2(n * config.caixa_custo)
  const custo_envelope = r2(config.envelope_custo)
  const custo_papel_seda = r2(n * config.papel_seda_custo)
  const custo_cartao = r2(n * config.cartao_custo)
  const custo_adesivo_caixa = r2(n * (config.adesivo_caixa_custo || 0))
  const custo_lacre_caixa = r2(n * (config.lacre_caixa_custo || 0))
  const custo_total_pedido = r2(custo_imas + custo_impressao + custo_saquinhos + custo_caixa + custo_envelope + custo_papel_seda + custo_cartao + custo_adesivo_caixa + custo_lacre_caixa)
  return { qtd_imas: qtdImas, custo_imas, custo_impressao, custo_saquinhos, custo_caixa, custo_envelope, custo_papel_seda, custo_cartao, custo_adesivo_caixa, custo_lacre_caixa, custo_total_pedido }
}
