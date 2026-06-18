'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TIPO_PARA_CONFIG, garantirInsumos } from '@/lib/utils/estoque'

export default function EntradaEstoquePage() {
  const router = useRouter()
  const [insumos, setInsumos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [empresaId, setEmpresaId] = useState('')

  // Form
  const [insumoId, setInsumoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [valorPago, setValorPago] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [observacoes, setObservacoes] = useState('')

  const insumoSelecionado = insumos.find(i => i.id === insumoId)
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
      if (ins && ins.length > 0) setInsumoId(ins[0].id)
      setLoading(false)
    }
    carregar()
  }, [])

  async function salvar() {
    if (!insumoId || !quantidade || parseFloat(quantidade) <= 0) return alert('Informe o insumo e a quantidade')
    setSalvando(true)

    const supabase = createClient()
    const qtd = parseFloat(quantidade)
    const vp = parseFloat(valorPago) || 0
    const cu = vp > 0 && qtd > 0 ? vp / qtd : null

    // Registra movimentação
    await supabase.from('movimentacoes_estoque').insert({
      empresa_id: empresaId,
      insumo_id: insumoId,
      tipo: 'entrada',
      quantidade: qtd,
      valor_pago: vp || null,
      custo_unitario: cu,
      observacoes: observacoes || null,
      data,
    })

    // Atualiza quantidade e custo unitário do insumo
    const atualInsumo = insumos.find(i => i.id === insumoId)
    const novaQtd = Number(atualInsumo?.quantidade || 0) + qtd

    const updateInsumo: any = {
      quantidade: Number(novaQtd.toFixed(3)),
      updated_at: new Date().toISOString(),
    }
    if (cu) updateInsumo.custo_unitario = Number(cu.toFixed(4))

    await supabase.from('insumos').update(updateInsumo).eq('id', insumoId)

    // Atualiza custo em configuracoes_materiais se houver mapeamento
    if (cu && atualInsumo?.tipo) {
      const campoConfig = TIPO_PARA_CONFIG[atualInsumo.tipo]
      if (campoConfig) {
        await supabase
          .from('configuracoes_materiais')
          .update({ [campoConfig]: Number(cu.toFixed(4)) })
          .eq('empresa_id', empresaId)
      }
    }

    router.push('/estoque')
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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
            {insumos.map(i => (
              <option key={i.id} value={i.id}>{i.nome}</option>
            ))}
          </select>
          {insumoSelecionado && (
            <p className="text-xs text-gray-400 mt-1">
              Estoque atual: {Number(insumoSelecionado.quantidade).toFixed(
                insumoSelecionado.unidade === 'folha' ? 1 : 0
              )} {insumoSelecionado.unidade}s
            </p>
          )}
        </div>

        {/* Quantidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantidade comprada *</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
              placeholder="0"
              min="0"
              step="0.5"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-sm text-gray-500 w-16 text-center">
              {insumoSelecionado?.unidade || 'un'}
            </span>
          </div>
        </div>

        {/* Valor pago */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor pago (R$)</label>
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

        {/* Custo unitário calculado */}
        {custoUnitario !== null && (
          <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-green-700">Custo unitário calculado</p>
              <p className="text-xs text-green-600 mt-0.5">
                Será usado nos próximos pedidos
              </p>
            </div>
            <p className="text-lg font-bold text-green-700">
              {fmt(custoUnitario)}
            </p>
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
