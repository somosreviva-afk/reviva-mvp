'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react'

type Config = Record<string, string>

type Custos = {
  fotoimagas: number
  auxiliar: number
  combustivel: number
  pedagio: number
  alimentacao: number
  hospedagem: number
  embalagem: number
  outros: number
  total: number
}

function calcularCustos(campos: any, config: Config): Custos {
  const qtd = parseInt(campos.qtd_convidados) || 0
  const horas = parseInt(campos.horas_evento) || 4
  const custoIma = parseFloat(config.custo_fotoimagas_por_convidado || '1.75')
  const custoAuxiliarHora = parseFloat(config.custo_auxiliar_hora || '30')

  const fotoimagas = qtd * custoIma
  const auxiliar = parseFloat(campos.custo_auxiliar) || (horas * custoAuxiliarHora)
  const combustivel = parseFloat(campos.custo_combustivel) || 0
  const pedagio = parseFloat(campos.custo_pedagio) || 0
  const alimentacao = parseFloat(campos.custo_alimentacao) || 0
  const hospedagem = parseFloat(campos.custo_hospedagem) || 0
  const embalagem = parseFloat(campos.custo_embalagem) || 0
  const outros = parseFloat(campos.custo_outros) || 0

  const total = fotoimagas + auxiliar + combustivel + pedagio + alimentacao + hospedagem + embalagem + outros
  return { fotoimagas, auxiliar, combustivel, pedagio, alimentacao, hospedagem, embalagem, outros, total }
}

export default function NovoOrcamentoPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [config, setConfig] = useState<Config>({})
  const [tabelaPrecos, setTabelaPrecos] = useState<any[]>([])
  const [salvando, setSalvando] = useState(false)
  const [mostrarCustos, setMostrarCustos] = useState(false)

  const [campos, setCampos] = useState({
    qtd_convidados: '',
    data_evento: '',
    local_evento: '',
    horas_evento: '4',
    custo_auxiliar: '',
    custo_combustivel: '',
    custo_pedagio: '',
    custo_alimentacao: '',
    custo_hospedagem: '',
    custo_embalagem: '',
    custo_outros: '',
    margem_lucro: '40',
    sinal_percentual: '50',
    validade_dias: '7',
    observacoes: '',
    valor_final: '',
  })

  const carregarDados = useCallback(async () => {
    const [{ data: cfgs }, { data: tabela }] = await Promise.all([
      supabase.from('eventos_configuracoes').select('chave,valor'),
      supabase.from('eventos_tabela_precos').select('*').eq('ativo', true).order('qtd_min'),
    ])
    const configMap: Config = {}
    ;(cfgs || []).forEach((c: any) => { configMap[c.chave] = c.valor })
    setConfig(configMap)
    setTabelaPrecos(tabela || [])
    setCampos(p => ({
      ...p,
      margem_lucro: configMap.margem_lucro_padrao || '40',
      sinal_percentual: configMap.sinal_percentual_padrao || '50',
      validade_dias: configMap.validade_orcamento_dias || '7',
    }))
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  const custos = calcularCustos(campos, config)
  const margem = parseFloat(campos.margem_lucro) / 100
  const valorSugerido = custos.total > 0 ? custos.total / (1 - margem) : 0

  // Preço da tabela
  const qtdConvidados = parseInt(campos.qtd_convidados) || 0
  const precoTabela = tabelaPrecos.find(t => qtdConvidados >= t.qtd_min && qtdConvidados <= t.qtd_max)

  const valorFinalExibido = parseFloat(campos.valor_final) || valorSugerido

  async function salvar(status: 'rascunho' | 'enviado') {
    setSalvando(true)
    // Gerar número do orçamento
    const { count } = await supabase.from('eventos_orcamentos').select('*', { count: 'exact', head: true })
    const numero = `ORC-${String((count || 0) + 1).padStart(3, '0')}`

    await supabase.from('eventos_orcamentos').insert({
      numero,
      status,
      qtd_convidados: qtdConvidados || null,
      data_evento: campos.data_evento || null,
      local_evento: campos.local_evento || null,
      horas_evento: parseInt(campos.horas_evento) || 4,
      custo_fotoimagas: custos.fotoimagas,
      custo_auxiliar: custos.auxiliar,
      custo_combustivel: custos.combustivel,
      custo_pedagio: custos.pedagio,
      custo_alimentacao: custos.alimentacao,
      custo_hospedagem: custos.hospedagem,
      custo_embalagem: custos.embalagem,
      custo_outros: custos.outros,
      custo_total: custos.total,
      margem_lucro: parseFloat(campos.margem_lucro),
      valor_sugerido: valorSugerido,
      valor_final: parseFloat(campos.valor_final) || valorSugerido,
      sinal_percentual: parseFloat(campos.sinal_percentual),
      validade_dias: parseInt(campos.validade_dias),
      observacoes: campos.observacoes || null,
    })
    router.push('/eventos/orcamentos')
  }

  function atualizar(campo: string, valor: string) {
    setCampos(p => ({ ...p, [campo]: valor }))
  }

  return (
    <div className="p-4 space-y-4 pb-32">
      <div>
        <h1 className="text-lg font-bold text-purple-900">Novo Orçamento</h1>
        <p className="text-xs text-purple-500">Simulador inteligente de preços</p>
      </div>

      {/* Dados do evento */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="font-semibold text-gray-800 text-sm">Dados do evento</h2>
        <div>
          <label className="text-xs font-medium text-gray-600">Nº de convidados *</label>
          <input
            type="number"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400"
            value={campos.qtd_convidados}
            onChange={e => atualizar('qtd_convidados', e.target.value)}
            placeholder="Ex: 150"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Data do evento</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400"
              value={campos.data_evento}
              onChange={e => atualizar('data_evento', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Horas de evento</label>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400"
              value={campos.horas_evento}
              onChange={e => atualizar('horas_evento', e.target.value)}
              placeholder="4"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Local</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400"
            value={campos.local_evento}
            onChange={e => atualizar('local_evento', e.target.value)}
            placeholder="Nome do espaço ou cidade"
          />
        </div>
      </div>

      {/* Custos detalhados */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setMostrarCustos(!mostrarCustos)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800"
        >
          <span>Custos detalhados</span>
          {mostrarCustos ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {mostrarCustos && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            {[
              { campo: 'custo_auxiliar', label: `Auxiliar (auto: R$ ${(parseInt(campos.horas_evento || '4') * parseFloat(config.custo_auxiliar_hora || '30')).toFixed(2)})` },
              { campo: 'custo_combustivel', label: 'Combustível (R$)' },
              { campo: 'custo_pedagio', label: 'Pedágio (R$)' },
              { campo: 'custo_alimentacao', label: 'Alimentação (R$)' },
              { campo: 'custo_hospedagem', label: 'Hospedagem (R$)' },
              { campo: 'custo_embalagem', label: 'Embalagem extra (R$)' },
              { campo: 'custo_outros', label: 'Outros custos (R$)' },
            ].map(({ campo, label }) => (
              <div key={campo}>
                <label className="text-xs font-medium text-gray-600">{label}</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={(campos as any)[campo]}
                  onChange={e => atualizar(campo, e.target.value)}
                  placeholder="0,00"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resultado */}
      {qtdConvidados > 0 && (
        <div className="bg-purple-600 rounded-2xl p-4 text-white shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Calculator size={16} />
            <span className="font-semibold text-sm">Simulação de preço</span>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-purple-200">Fotoímãs ({qtdConvidados} × R$ {parseFloat(config.custo_fotoimagas_por_convidado || '1.75').toFixed(2)})</span>
              <span>R$ {custos.fotoimagas.toFixed(2)}</span>
            </div>
            {custos.auxiliar > 0 && <div className="flex justify-between"><span className="text-purple-200">Auxiliar</span><span>R$ {custos.auxiliar.toFixed(2)}</span></div>}
            {custos.combustivel > 0 && <div className="flex justify-between"><span className="text-purple-200">Combustível</span><span>R$ {custos.combustivel.toFixed(2)}</span></div>}
            {custos.pedagio > 0 && <div className="flex justify-between"><span className="text-purple-200">Pedágio</span><span>R$ {custos.pedagio.toFixed(2)}</span></div>}
            {custos.alimentacao > 0 && <div className="flex justify-between"><span className="text-purple-200">Alimentação</span><span>R$ {custos.alimentacao.toFixed(2)}</span></div>}
            {custos.hospedagem > 0 && <div className="flex justify-between"><span className="text-purple-200">Hospedagem</span><span>R$ {custos.hospedagem.toFixed(2)}</span></div>}
            {custos.embalagem > 0 && <div className="flex justify-between"><span className="text-purple-200">Embalagem</span><span>R$ {custos.embalagem.toFixed(2)}</span></div>}
            {custos.outros > 0 && <div className="flex justify-between"><span className="text-purple-200">Outros</span><span>R$ {custos.outros.toFixed(2)}</span></div>}
            <div className="flex justify-between border-t border-purple-500 pt-2 font-semibold">
              <span>Custo total</span><span>R$ {custos.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-purple-700 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-200">Margem de lucro</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-14 bg-purple-800 text-white text-xs rounded-lg px-2 py-1 text-center focus:outline-none"
                  value={campos.margem_lucro}
                  onChange={e => atualizar('margem_lucro', e.target.value)}
                />
                <span className="text-xs">%</span>
              </div>
            </div>
            <div className="flex justify-between font-bold text-base">
              <span>Preço sugerido</span>
              <span>R$ {valorSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {precoTabela && (
              <div className="flex items-center gap-1 text-[10px] text-purple-300">
                <Info size={10} />
                Tabela sugere: R$ {Number(precoTabela.preco_sugerido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para {precoTabela.descricao}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-purple-200">Valor final (personalize se desejar)</label>
            <input
              type="number"
              step="0.01"
              className="w-full bg-purple-700 text-white rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-purple-300 placeholder-purple-400"
              value={campos.valor_final}
              onChange={e => atualizar('valor_final', e.target.value)}
              placeholder={valorSugerido.toFixed(2)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-purple-700 rounded-xl p-2.5">
              <p className="text-purple-300">Sinal ({campos.sinal_percentual}%)</p>
              <p className="font-bold text-sm">R$ {(valorFinalExibido * (parseFloat(campos.sinal_percentual) / 100)).toFixed(2)}</p>
              <input
                type="number"
                className="w-full bg-purple-800 text-white text-xs rounded-lg px-2 py-1 mt-1 focus:outline-none"
                value={campos.sinal_percentual}
                onChange={e => atualizar('sinal_percentual', e.target.value)}
                placeholder="50"
              />
              <span className="text-purple-400 text-[10px]">%</span>
            </div>
            <div className="bg-purple-700 rounded-xl p-2.5">
              <p className="text-purple-300">Restante</p>
              <p className="font-bold text-sm">R$ {(valorFinalExibido * (1 - parseFloat(campos.sinal_percentual) / 100)).toFixed(2)}</p>
              <p className="text-purple-400 text-[10px] mt-1">No dia do evento</p>
            </div>
          </div>
        </div>
      )}

      {/* Validade e observações */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Validade (dias)</label>
          <input
            type="number"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400"
            value={campos.validade_dias}
            onChange={e => atualizar('validade_dias', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Observações</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400 resize-none"
            rows={3}
            value={campos.observacoes}
            onChange={e => atualizar('observacoes', e.target.value)}
            placeholder="Itens inclusos, condições especiais..."
          />
        </div>
      </div>

      {/* Botões */}
      <div className="fixed bottom-20 left-0 right-0 px-4 flex gap-3">
        <button
          onClick={() => salvar('rascunho')}
          disabled={salvando}
          className="flex-1 py-3 rounded-xl border-2 border-purple-600 text-purple-600 text-sm font-semibold bg-white shadow-lg"
        >
          Salvar rascunho
        </button>
        <button
          onClick={() => salvar('enviado')}
          disabled={salvando || qtdConvidados === 0}
          className="flex-1 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold shadow-lg disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Marcar como enviado'}
        </button>
      </div>
    </div>
  )
}
