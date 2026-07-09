'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Clock, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TIPO_PARA_CONFIG, TIPOS_IMA, garantirInsumos, atualizarImaCusto } from '@/lib/utils/estoque'

// Grupo dos 3 componentes comprados juntos (sem ima_magnetico que vem de outro fornecedor)
const BASE_GRUPO_ID = '__base_grupo__'

export default function EntradaEstoquePage() {
  const router = useRouter()
  const [insumos, setInsumos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [empresaId, setEmpresaId] = useState('')

  const [insumoId, setInsumoId] = useState(BASE_GRUPO_ID)
  const [quantidade, setQuantidade] = useState('')
  const [valorPago, setValorPago] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [observacoes, setObservacoes] = useState('')
  const [tipoCompra, setTipoCompra] = useState<'completo' | 'sem_ima'>('sem_ima')

  const isBaseGrupo = insumoId === BASE_GRUPO_ID
  const insumoSelecionado = isBaseGrupo ? null : insumos.find(i => i.id === insumoId)
  const isComponenteIma = isBaseGrupo || TIPOS_IMA.includes(insumoSelecionado?.tipo || '')

  // Referência de estoque atual para status do lote
  const imaRef = insumos.find(i => i.tipo === 'placa_plastico')
  const estoqueReferencia = isBaseGrupo
    ? Number(imaRef?.quantidade || 0)
    : Number(insumoSelecionado?.quantidade || 0)
  const lotStatus: 'ativo' | 'pendente' = estoqueReferencia === 0 ? 'ativo' : 'pendente'

  const qtdNum = parseFloat(quantidade) || 0

  // custo_unitario = custo POR PEÇA individual
  // Para o grupo de 3: total pago / 3 / qtd (divide entre os 3 tipos)
  // Para individual: total pago / qtd
  const custoUnitario = valorPago && qtdNum > 0
    ? isBaseGrupo
      ? parseFloat(valorPago) / 3 / qtdNum
      : parseFloat(valorPago) / qtdNum
    : null

  // Custo por ímã = soma dos 4 componentes (exibição)
  const custoporIma = custoUnitario !== null
    ? isBaseGrupo
      ? custoUnitario * 3 // os 3 componentes comprados juntos
      : custoUnitario      // 1 componente individual
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
    if (!insumoId || !qtdNum || qtdNum <= 0) return alert('Informe o material e a quantidade')
    setSalvando(true)
    const supabase = createClient()
    const vp = parseFloat(valorPago) || 0

    // Quais insumos registrar e custo por peça de cada
    let targets: { insumo: any; cu: number | null }[] = []

    if (isBaseGrupo) {
      // Material completo: entra também o ímã magnético (4 tipos, custo dividido por 4)
      // Material sem ímã: só as 3 placas (ímã será comprado separadamente)
      const tipos = tipoCompra === 'completo'
        ? ['placa_plastico', 'placa_metal', 'plastico_protecao', 'ima_magnetico']
        : ['placa_plastico', 'placa_metal', 'plastico_protecao']
      const divisor = tipoCompra === 'completo' ? 4 : 3
      const cu = vp > 0 ? vp / divisor / qtdNum : null
      tipos.forEach(tipo => {
        const ins = insumos.find(i => i.tipo === tipo)
        if (ins) targets.push({ insumo: ins, cu })
      })
    } else {
      const ins = insumos.find(i => i.id === insumoId)
      if (ins) targets.push({ insumo: ins, cu: vp > 0 ? vp / qtdNum : null })
    }

    const hoje = data

    for (let idx = 0; idx < targets.length; idx++) {
      const { insumo, cu } = targets[idx]
      const estoqueAtual = Number(insumo.quantidade || 0)
      const status: 'ativo' | 'pendente' = estoqueAtual === 0 ? 'ativo' : 'pendente'

      // Cria lote
      await supabase.from('lotes_estoque').insert({
        empresa_id: empresaId,
        insumo_id: insumo.id,
        quantidade_inicial: qtdNum,
        quantidade_restante: qtdNum,
        custo_unitario: cu != null ? Number(cu.toFixed(4)) : null,
        status,
        data_compra: hoje,
        observacoes: observacoes || null,
        com_ima_incorporado: isBaseGrupo && tipoCompra === 'completo',
      })

      // Atualiza quantidade e custo do insumo
      const updateInsumo: any = {
        quantidade: Number((estoqueAtual + qtdNum).toFixed(3)),
        updated_at: new Date().toISOString(),
      }
      if (status === 'ativo' && cu != null) updateInsumo.custo_unitario = Number(cu.toFixed(4))
      await supabase.from('insumos').update(updateInsumo).eq('id', insumo.id)

      // Se lote entra ativo, atualiza configuracoes
      if (status === 'ativo' && cu != null) {
        const campoConfig = TIPO_PARA_CONFIG[insumo.tipo]
        if (campoConfig === 'ima_custo') {
          await atualizarImaCusto(supabase, empresaId, insumo.id, Number(cu.toFixed(4)))
        } else if (campoConfig) {
          await supabase
            .from('configuracoes_materiais')
            .update({ [campoConfig]: Number(cu.toFixed(4)) })
            .eq('empresa_id', empresaId)
        }
      }

      // Movimentação (valor_pago só no primeiro do grupo)
      await supabase.from('movimentacoes_estoque').insert({
        empresa_id: empresaId,
        insumo_id: insumo.id,
        tipo: 'entrada',
        quantidade: qtdNum,
        valor_pago: idx === 0 ? (vp || null) : null,
        custo_unitario: cu != null ? Number(cu.toFixed(4)) : null,
        observacoes: observacoes || null,
        data: hoje,
      })
    }

    router.push('/estoque')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const imaMagnetico = insumos.find(i => i.tipo === 'ima_magnetico')
  const insumosEmbalagem = insumos.filter(i => !TIPOS_IMA.includes(i.tipo))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

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
            <optgroup label="Componentes do Ímã">
              <option value={BASE_GRUPO_ID}>🧲 Placa Plástico + Metal + Proteção (juntos)</option>
              {imaMagnetico && (
                <option value={imaMagnetico.id}>🔩 Ímã Magnético (separado)</option>
              )}
            </optgroup>
            <optgroup label="Embalagem">
              {insumosEmbalagem.map(i => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </optgroup>
          </select>

          {isBaseGrupo ? (
            <p className="text-xs text-gray-400 mt-1">
              Estoque atual: {Number(imaRef?.quantidade || 0).toFixed(0)} unidades de cada
            </p>
          ) : insumoSelecionado ? (
            <p className="text-xs text-gray-400 mt-1">
              Estoque atual: {Number(insumoSelecionado.quantidade).toFixed(
                insumoSelecionado.unidade === 'folha' ? 1 : 0
              )} {insumoSelecionado.unidade}s
            </p>
          ) : null}
        </div>

        {/* Tipo da Compra — só para o grupo de placas */}
        {isBaseGrupo && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo da Compra *</label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                tipoCompra === 'sem_ima' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
              }`}>
                <input
                  type="radio"
                  name="tipoCompra"
                  value="sem_ima"
                  checked={tipoCompra === 'sem_ima'}
                  onChange={() => setTipoCompra('sem_ima')}
                  className="mt-0.5 accent-green-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Material sem ímã</p>
                  <p className="text-xs text-gray-500">Só as placas. O ímã magnético será comprado e registrado separadamente.</p>
                </div>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                tipoCompra === 'completo' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
              }`}>
                <input
                  type="radio"
                  name="tipoCompra"
                  value="completo"
                  checked={tipoCompra === 'completo'}
                  onChange={() => setTipoCompra('completo')}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Material completo (já possui ímã)</p>
                  <p className="text-xs text-gray-500">O ímã já vem incorporado na placa. Custo do ímã embutido no valor pago.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Quantidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Quantidade comprada *
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
              {isBaseGrupo ? 'un de cada' : (insumoSelecionado?.unidade || 'un')}
            </span>
          </div>
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
          <div className="bg-blue-50 rounded-xl px-4 py-3 space-y-1">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-blue-700">
                Custo por peça{isBaseGrupo && tipoCompra === 'completo' ? ' (inclui ímã)' : ''}
              </p>
              <p className="text-base font-bold text-blue-700">{fmt(custoUnitario)}</p>
            </div>
            {isBaseGrupo && (
              <div className="flex justify-between items-center">
                <p className="text-xs text-blue-600">
                  {tipoCompra === 'completo'
                    ? 'Custo por ímã completo (4 componentes)'
                    : 'Contribuição por ímã (3 componentes)'}
                </p>
                <p className="text-sm font-semibold text-blue-600">
                  {fmt(tipoCompra === 'completo' ? custoUnitario * 4 : custoUnitario * 3)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Status do lote */}
        {quantidade && qtdNum > 0 && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
            lotStatus === 'ativo'
              ? 'bg-green-50 border border-green-200'
              : 'bg-orange-50 border border-orange-200'
          }`}>
            {lotStatus === 'ativo'
              ? <Zap size={16} className="text-green-600 shrink-0" />
              : <Clock size={16} className="text-orange-500 shrink-0" />
            }
            <div>
              <p className={`text-xs font-semibold ${lotStatus === 'ativo' ? 'text-green-700' : 'text-orange-700'}`}>
                {lotStatus === 'ativo' ? 'Entra agora (estoque zerado)' : 'Lote pendente'}
              </p>
              <p className={`text-xs mt-0.5 ${lotStatus === 'ativo' ? 'text-green-600' : 'text-orange-600'}`}>
                {lotStatus === 'ativo'
                  ? 'O custo atualiza imediatamente'
                  : `Aguarda as ${estoqueReferencia.toFixed(0)} unidades atuais acabarem`}
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
            placeholder="Ex: Fornecedor X"
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
