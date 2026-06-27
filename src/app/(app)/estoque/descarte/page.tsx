'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DescartePage() {
  const router = useRouter()
  const [insumos, setInsumos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [empresaId, setEmpresaId] = useState('')

  const [insumoId, setInsumoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const eid = usuario!.empresa_id
      setEmpresaId(eid)
      const { data: ins } = await supabase.from('insumos').select('*').eq('empresa_id', eid).order('nome')
      setInsumos(ins || [])
      if (ins && ins.length > 0) setInsumoId(ins[0].id)
      setLoading(false)
    }
    carregar()
  }, [])

  const insumoSelecionado = insumos.find(i => i.id === insumoId)
  const qtdNum = parseFloat(quantidade) || 0
  const estoqueAtual = Number(insumoSelecionado?.quantidade || 0)

  async function salvar() {
    if (!insumoId || qtdNum <= 0) return alert('Informe o material e a quantidade')
    if (qtdNum > estoqueAtual) return alert(`Você só tem ${estoqueAtual} ${insumoSelecionado?.unidade}s em estoque`)

    setSalvando(true)
    const supabase = createClient()

    // Desconta do estoque
    const novaQtd = Math.max(0, estoqueAtual - qtdNum)
    await supabase
      .from('insumos')
      .update({ quantidade: Number(novaQtd.toFixed(3)), updated_at: new Date().toISOString() })
      .eq('id', insumoId)

    // Registra movimentação
    await supabase.from('movimentacoes_estoque').insert({
      empresa_id: empresaId,
      insumo_id: insumoId,
      tipo: 'saida',
      quantidade: qtdNum,
      data,
      observacoes: `Descarte${motivo ? ` — ${motivo}` : ''}`,
    })

    router.push('/estoque')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 pb-10">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/estoque" className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Descarte de Material</h1>
      </div>

      <div className="space-y-4">
        {/* Material */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Material perdido</label>
          <select
            value={insumoId}
            onChange={e => setInsumoId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            {insumos.map(i => (
              <option key={i.id} value={i.id}>
                {i.nome} — {Number(i.quantidade).toFixed(0)} {i.unidade}s disponíveis
              </option>
            ))}
          </select>
        </div>

        {/* Quantidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantidade perdida</label>
          <input
            type="number"
            inputMode="decimal"
            value={quantidade}
            onChange={e => setQuantidade(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="0"
            min="0"
            step="1"
          />
          {insumoSelecionado && (
            <p className="text-xs text-gray-400 mt-1">
              Estoque atual: {estoqueAtual.toFixed(0)} {insumoSelecionado.unidade}s
              {qtdNum > 0 && ` → vai ficar: ${Math.max(0, estoqueAtual - qtdNum).toFixed(0)}`}
            </p>
          )}
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo (opcional)</label>
          <input
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Ex: ímã errado, quebrou, impressão com defeito..."
          />
        </div>

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        {/* Botão */}
        <button
          onClick={salvar}
          disabled={salvando || !insumoId || qtdNum <= 0}
          className="w-full bg-red-500 text-white py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          <Trash2 size={18} />
          {salvando ? 'Registrando...' : 'Registrar Descarte'}
        </button>
      </div>
    </div>
  )
}
