'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Clock, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TIPO_PARA_CONFIG, TIPOS_IMA, garantirInsumos } from '@/lib/utils/estoque'

const IMA_GRUPO_ID = '__ima_grupo__'

export default function EntradaEstoquePage() {
  const router = useRouter()
  const [insumos, setInsumos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [empresaId, setEmpresaId] = useState('')

  // Form
  const [insumoId, setInsumoId] = useState(IMA_GRUPO_ID)
  const [quantidade, setQuantidade] = useState('')
  const [valorPago, setValorPago] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [observacoes, setObservacoes] = useState('')

  const isImaGrupo = insumoId === IMA_GRUPO_ID
  const insumoSelecionado = isImaGrupo ? null : insumos.find(i => i.id === insumoId)

  // Para determinar se o lote vai entrar como ativo ou pendente
  const imaRef = insumos.find(i => i.tipo === 'ima_magnetico')
  const estoqueReferencia = isImaGrupo
    ? Number(imaRef?.quantidade || 0)
    : Number(insumoSelecionado?.quantidade || 0)

  const lotStatus: 'ativo' | 'pendente' = estoqueReferencia === 0 ? 'ativo' : 'pendente'

  const custoUnitario = quantidade && valorPago && parseFloat(quantidade) > 0
    ? parseFloat(valorPago) / parseFloat(quantidade)
    : null

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const eid = usuario!.empresa_id
      setEmpresaId(eid)

      await garantirInsumos(supabase, eid)
      const { data: ins } = await supabase.from('insumos').select('*').eq('empresa_id', eid).order('nome')
      setInsumos(ins || [])
      setLoading(false)
    }
    carregar()
  }, [])

  async function salvar() {
    const qtd = parseFloat(quantidade)
    if (!insumoId || !qtd || qtd <= 0) return alert('Informe o material e a quantidade')

    setSalvando(true)
    const supabase = createClient()
    const vp = parseFloat(valorPago) || 0
    const cu = vp > 0 && qtd > 0 ? vp / qtd : null
    const hoje = data

    // Determina quais insumos registrar
    let targetInsumos: any[] = []
    if (isImaGrupo) {
      // Todos os 4 componentes do ímã
      targetInsumos = TIPOS_IMA.map(tipo => insumos.find(i => i.tipo === tipo)).filter(Boolean)
    } else {
      const ins = insumos.find(i => i.id === insumoId)
      if (ins) targetInsumos = [ins]
    }

    for (let idx = 0; idx < targetInsumos.length; idx++) {
      const insumo = targetInsumos[idx]
      const estoqueAtual = Number(insumo.quantidade || 0)
      const status: 'ativo' | 'pendente' = estoqueAtual === 0 ? 'ativo' : 'pendente'

      // Cria o lote
      await supabase.from('lotes_estoque').insert({
        empresa_id: empresaId,
        insumo_id: insumo.id,
        quantidade_inicial: qtd,
        quantidade_restante: qtd,
        custo_unitario: cu != null ? Number(cu.toFixed(4)) : null,
        status,
        data_compra: hoje,
        observacoes: observacoes || null,
      })

      // Atualiza quantidade total no insumo
      const novaQtd = estoqueAtual + qtd
      const updateInsumo: any = {
        quantidade: Number(novaQtd.toFixed(3)),
        updated_at: new Date().toISOString(),
      }
      // Se o lote já entra ativo, atualiza o custo_unitario imediatamente
      if (status === 'ativo' && cu != null) {
        updateInsumo.custo_unitario = Number(cu.toFixed(4))
      }
      await supabase.from('insumos').update(updateInsumo).eq('id', insumo.id)

      // Se ativo, atualiza configuracoes_materiais agora
      if (status === 'ativo' && cu != null && insumo.tipo) {
        const campoConfig = TIPO_PARA_CONFIG[insumo.tipo]
        if (campoConfig) {
          await supabase
            .from('configuracoes_materiais')
            .update({ [campoConfig]: Number(cu.toFixed(4)) })
            .eq('empresa_id', empresaId)
        }
      }

      // Registra movimentação (valor_pago só no primeiro do grupo de ímãs)
      await supabase.from('movimentacoes_estoque').insert({
        empresa_id: empresaId,
        insumo_id: insumo.id,
        tipo: 'entrada',
        quantidade: qtd,
        valor_pago: idx === 0 ? (vp || null) : null,
        custo_unitario: cu != null ? Number(cu.toFixed(4)) : null,
        observacoes: observacoes || null,
        data: hoje,
      })
    }

    router.push('/estoque')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // Separa os insumos de ímã dos de embalagem para exibição
  const insumosEmbalagem = insumos.filter(i => !TIPOS_IMA.includes(i.tipo))

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/estoque" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Entrada de Estoque</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">

        {/* Material */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Material *</label>
          <select
            value={insumoId}
            onChange={e => setInsumoId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            {/* Opção especial para os 4 componentes do ímã juntos */}
            <option value={IMA_GRUPO_ID}>🧲 Componentes do Ímã (todos os 4 juntos)</option>
            <optgroup label="Embalagem">
              {insumosEmbalagem.map(i => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </optgroup>
          </select>

          {/* Info do estoque atual */}
          {isImaGrupo ? (
            <p className="text-xs text-gray-400 mt-1">
              Estoque atual: {Number(imaRef?.quantidade || 0).toFixed(0)} unidades de cada componente
            </p>
          ) : insumoSelecionado ? (
            <p className="text-xs text-gray-400 mt-1">
              Estoque atual: {Number(insumoSelecionado.quantidade).toFixed(
                insumoSelecionado.unidade === 'folha' ? 1 : 0
              )} {insumoSelecionado.unidade}s
            </p>
          ) : null}
        </div>

        {/* Quantidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {isImaGrupo ? 'Quantidade (kits de ímã)' : 'Quantidade comprada'} *
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-sm text-gray-500 w-20 text-center">
              {isImaGrupo ? 'kits' : (insumoSelecionado?.unidade || 'un')}
            </span>
          </div>
          {isImaGrupo && (
            <p className="text-xs text-gray-400 mt-1">
              1 kit = 1 ímã magnético + 1 placa de plástico + 1 placa de metal + 1 plástico de proteção
            </p>
          )}
        </div>

        {/* Valor pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Valor total pago (R$)
          </label>
          <input
            type="number"
            value={valorPago}
            onChange={e => setValorPago(e.target.value)}
            placeholder="0,00"
            step="0.01"
            min="0"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Custo calculado */}
        {custoUnitario !== null && (
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-blue-700">
                {isImaGrupo ? 'Custo por ímã (conjunto)' : 'Custo unitário'}
              </p>
              <p className="text-xs text-blue-500 mt-0.5">
                {isImaGrupo ? 'Valor que entra no cálculo de cada pedido' : 'Por unidade deste material'}
              </p>
            </div>
            <p className="text-lg font-bold text-blue-700">{fmt(custoUnitario)}</p>
          </div>
        )}

        {/* Status do lote */}
        {quantidade && parseFloat(quantidade) > 0 && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
            lotStatus === 'ativo'
              ? 'bg-green-50 border border-green-200'
              : 'bg-orange-50 border border-orange-200'
          }`}>
            {lotStatus === 'ativo' ? (
              <Zap size={16} className="text-green-600 shrink-0" />
            ) : (
              <Clock size={16} className="text-orange-500 shrink-0" />
            )}
            <div>
              <p className={`text-xs font-semibold ${lotStatus === 'ativo' ? 'text-green-700' : 'text-orange-700'}`}>
                {lotStatus === 'ativo' ? 'Entra agora (estoque zerado)' : 'Lote pendente'}
              </p>
              <p className={`text-xs mt-0.5 ${lotStatus === 'ativo' ? 'text-green-600' : 'text-orange-600'}`}>
                {lotStatus === 'ativo'
                  ? 'O custo será atualizado imediatamente'
                  : `Aguardando esgotar as ${estoqueReferencia.toFixed(0)} unidades atuais`
                }
              </p>
            </div>
          </div>
        )}

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data da compra</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
          <input
            type="text"
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Ex: Compra no fornecedor X"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="pb-8">
        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-all"
        >
          {salvando ? 'Salvando...' : 'Registrar Entrada'}
        </button>
      </div>
    </div>
  )
}
