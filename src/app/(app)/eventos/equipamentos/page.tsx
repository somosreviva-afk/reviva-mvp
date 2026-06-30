'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Package, TrendingDown } from 'lucide-react'

type Equipamento = {
  id: string
  nome: string
  descricao: string
  custo_aquisicao: number
  data_aquisicao: string
  vida_util_meses: number
  custo_por_evento: number
  ativo: boolean
  observacoes: string
}

export default function EquipamentosPage() {
  const [equips, setEquips] = useState<Equipamento[]>([])
  const [loading, setLoading] = useState(true)
  const [showNovo, setShowNovo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [novo, setNovo] = useState({
    nome: '', descricao: '', custo_aquisicao: '',
    data_aquisicao: '', vida_util_meses: '24', observacoes: ''
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('eventos_equipamentos').select('*').order('nome')
    setEquips(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function calcularDepreciacao(custo: number, vidaUtilMeses: number): number {
    if (!custo || !vidaUtilMeses) return 0
    return custo / vidaUtilMeses
  }

  async function salvar() {
    if (!novo.nome.trim()) return
    setSalvando(true)
    const custo = parseFloat(novo.custo_aquisicao) || 0
    const vida = parseInt(novo.vida_util_meses) || 24
    const custoPorEvento = calcularDepreciacao(custo, vida)

    await supabase.from('eventos_equipamentos').insert({
      nome: novo.nome,
      descricao: novo.descricao || null,
      custo_aquisicao: custo,
      data_aquisicao: novo.data_aquisicao || null,
      vida_util_meses: vida,
      custo_por_evento: custoPorEvento,
      observacoes: novo.observacoes || null,
    })
    await carregar()
    setNovo({ nome: '', descricao: '', custo_aquisicao: '', data_aquisicao: '', vida_util_meses: '24', observacoes: '' })
    setShowNovo(false)
    setSalvando(false)
  }

  // Preview do cálculo de ROI
  const custoPreview = parseFloat(novo.custo_aquisicao) || 0
  const vidaPreview = parseInt(novo.vida_util_meses) || 24
  const depreciacao = calcularDepreciacao(custoPreview, vidaPreview)

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-purple-900">Equipamentos</h1>
          <p className="text-xs text-purple-500">Controle de depreciação e ROI</p>
        </div>
        <button
          onClick={() => setShowNovo(true)}
          className="bg-purple-600 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          Novo
        </button>
      </div>

      <div className="space-y-3">
        {equips.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
            <Package size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Nenhum equipamento cadastrado</p>
            <p className="text-xs text-gray-400 mt-1">Cadastre para calcular o custo de depreciação por evento</p>
          </div>
        ) : (
          equips.map(eq => {
            const deprMensal = calcularDepreciacao(Number(eq.custo_aquisicao), eq.vida_util_meses)
            return (
              <div key={eq.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{eq.nome}</p>
                    {eq.descricao && <p className="text-xs text-gray-500">{eq.descricao}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${eq.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {eq.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-500">Custo</p>
                    <p className="text-sm font-bold text-gray-700">R$ {Number(eq.custo_aquisicao).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-500">Vida útil</p>
                    <p className="text-sm font-bold text-gray-700">{eq.vida_util_meses} meses</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-purple-600">Depr./mês</p>
                    <p className="text-sm font-bold text-purple-700">R$ {deprMensal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showNovo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800">Novo Equipamento</h2>
            <div>
              <label className="text-xs font-medium text-gray-600">Nome *</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Câmera fotográfica" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Descrição</label>
              <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                value={novo.descricao} onChange={e => setNovo(p => ({ ...p, descricao: e.target.value }))} placeholder="Modelo, marca..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Custo de aquisição (R$)</label>
                <input type="number" step="0.01" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={novo.custo_aquisicao} onChange={e => setNovo(p => ({ ...p, custo_aquisicao: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Vida útil (meses)</label>
                <input type="number" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={novo.vida_util_meses} onChange={e => setNovo(p => ({ ...p, vida_util_meses: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Data de aquisição</label>
              <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                value={novo.data_aquisicao} onChange={e => setNovo(p => ({ ...p, data_aquisicao: e.target.value }))} />
            </div>

            {custoPreview > 0 && (
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-200 flex items-center gap-2">
                <TrendingDown size={16} className="text-purple-500" />
                <div>
                  <p className="text-xs text-purple-600">Depreciação calculada</p>
                  <p className="text-sm font-bold text-purple-700">R$ {depreciacao.toFixed(2)}/mês</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNovo(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">Cancelar</button>
              <button onClick={salvar} disabled={salvando || !novo.nome.trim()} className="flex-1 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
