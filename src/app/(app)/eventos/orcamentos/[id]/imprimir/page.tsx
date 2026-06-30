import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BotaoPrint } from './BotaoPrint'

export default async function OrcamentoPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: orc }, { data: cfgs }] = await Promise.all([
    supabase.from('eventos_orcamentos').select('*').eq('id', id).single(),
    supabase.from('eventos_configuracoes').select('chave,valor'),
  ])

  if (!orc) notFound()

  const config: Record<string, string> = {}
  ;(cfgs || []).forEach((c: any) => { config[c.chave] = c.valor || '' })

  const valorFinal = Number(orc.valor_final || orc.valor_sugerido || 0)
  const sinalPct = Number(orc.sinal_percentual || 50)
  const sinal = valorFinal * (sinalPct / 100)
  const restante = valorFinal - sinal

  const dataValidade = orc.criado_em
    ? new Date(new Date(orc.criado_em).getTime() + (Number(orc.validade_dias || 7) * 86400000))
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  function fmtData(d: string) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  function fmt(v: number) {
    return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  }

  const custos = [
    { label: 'Fotoímãs', valor: orc.custo_fotoimagas, qtd: orc.qtd_convidados, unit: 4.50 },
    { label: 'Auxiliar', valor: orc.custo_auxiliar, qtd: null, unit: null },
    { label: 'Combustível', valor: orc.custo_combustivel, qtd: null, unit: null },
    { label: 'Pedágio', valor: orc.custo_pedagio, qtd: null, unit: null },
    { label: 'Alimentação', valor: orc.custo_alimentacao, qtd: null, unit: null },
    { label: 'Hospedagem', valor: orc.custo_hospedagem, qtd: null, unit: null },
    { label: 'Embalagem', valor: orc.custo_embalagem, qtd: null, unit: null },
    { label: 'Outros', valor: orc.custo_outros, qtd: null, unit: null },
  ].filter(c => Number(c.valor) > 0)

  const dataEmissao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* Botão de impressão — some no print */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <BotaoPrint />
        <a
          href={`/eventos/orcamentos/${id}`}
          className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium shadow"
        >
          ← Voltar
        </a>
      </div>

      {/* Página do orçamento */}
      <div className="orcamento-page min-h-screen bg-[#f5ede0] p-8 print:p-6">
        <div className="max-w-[700px] mx-auto">

          {/* Cabeçalho com logo */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-[#b5005e]/20">
            <img src="/logo-reviva.svg" alt="Reviva" className="h-16 w-auto" />
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Orçamento</p>
              <p className="text-2xl font-bold text-gray-800">{orc.numero}</p>
              <p className="text-xs text-gray-500 mt-1">Emitido em {dataEmissao}</p>
            </div>
          </div>

          {/* Dados do evento */}
          <div className="bg-white/60 rounded-2xl p-6 mb-5 border border-[#b5005e]/10">
            <h2 className="text-xs font-bold text-[#b5005e] uppercase tracking-widest mb-4">Dados do Evento</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Data do evento', value: fmtData(orc.data_evento) },
                { label: 'Local', value: orc.local_evento || '—' },
                { label: 'Nº de convidados', value: orc.qtd_convidados ? `${orc.qtd_convidados} pessoas` : '—' },
                { label: 'Duração estimada', value: orc.horas_evento ? `${orc.horas_evento} horas` : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Itens do orçamento */}
          <div className="bg-white/60 rounded-2xl p-6 mb-5 border border-[#b5005e]/10">
            <h2 className="text-xs font-bold text-[#b5005e] uppercase tracking-widest mb-4">Composição do Orçamento</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs text-gray-500 pb-2 font-medium">Item</th>
                  <th className="text-right text-xs text-gray-500 pb-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {custos.map(({ label, valor, qtd, unit }) => (
                  <tr key={label} className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-700">
                      {label}
                      {qtd && unit ? (
                        <span className="text-xs text-gray-400 ml-2">
                          {qtd} × R$ {fmt(unit)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 text-right font-medium text-gray-800">R$ {fmt(Number(valor))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Investimento */}
          <div className="bg-[#b5005e] rounded-2xl p-6 mb-5 text-white">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 text-pink-200">Investimento</h2>
            <div className="flex justify-between items-end mb-5">
              <div>
                <p className="text-pink-200 text-sm">Valor total do evento</p>
                <p className="text-3xl font-bold mt-1">R$ {fmt(valorFinal)}</p>
              </div>
              {orc.margem_lucro && (
                <p className="text-pink-300 text-xs">{orc.margem_lucro}% de margem</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/15 rounded-xl p-4">
                <p className="text-pink-200 text-xs uppercase tracking-wider">Sinal ({sinalPct}%)</p>
                <p className="text-xl font-bold mt-1">R$ {fmt(sinal)}</p>
                <p className="text-pink-300 text-[10px] mt-1">Para confirmar a data</p>
              </div>
              <div className="bg-white/15 rounded-xl p-4">
                <p className="text-pink-200 text-xs uppercase tracking-wider">Restante</p>
                <p className="text-xl font-bold mt-1">R$ {fmt(restante)}</p>
                <p className="text-pink-300 text-[10px] mt-1">No dia do evento</p>
              </div>
            </div>
          </div>

          {/* Observações */}
          {orc.observacoes && (
            <div className="bg-white/60 rounded-2xl p-6 mb-5 border border-[#b5005e]/10">
              <h2 className="text-xs font-bold text-[#b5005e] uppercase tracking-widest mb-3">Observações</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{orc.observacoes}</p>
            </div>
          )}

          {/* Validade */}
          <div className="bg-white/60 rounded-2xl p-5 mb-8 border border-[#b5005e]/10 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Validade deste orçamento</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{dataValidade}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Válido por</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{orc.validade_dias || 7} dias</p>
            </div>
          </div>

          {/* Rodapé */}
          <div className="border-t-2 border-[#b5005e]/20 pt-6 text-center">
            {config.nome_empresa && (
              <p className="text-sm font-semibold text-gray-700">{config.nome_empresa}</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
              {config.telefone_empresa && <span>📱 {config.telefone_empresa}</span>}
              {config.instagram_empresa && <span>📸 {config.instagram_empresa}</span>}
              {config.pix_empresa && <span>💳 PIX: {config.pix_empresa}</span>}
            </div>
            <p className="text-[10px] text-gray-400 mt-4">
              Este orçamento foi gerado em {dataEmissao} e é válido até {dataValidade}.
            </p>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #f5ede0 !important; }
          .orcamento-page { background: #f5ede0 !important; }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>
    </>
  )
}
