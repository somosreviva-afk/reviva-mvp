'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calculator } from 'lucide-react'
import Link from 'next/link'

export default function NovoProdutoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    custo_materiais: '',   // insumo (imãs)
    custo_adicional: '',   // embalagem + outros
    preco_venda: '',
  })

  const custoTotal =
    (parseFloat(form.custo_materiais) || 0) +
    (parseFloat(form.custo_adicional) || 0)

  const preco = parseFloat(form.preco_venda) || 0
  const lucro = preco - custoTotal
  const margem = preco > 0 ? (lucro / preco) * 100 : 0

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function fmt(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  async function salvar() {
    if (!form.nome.trim()) return alert('Informe o nome do produto')
    if (preco <= 0) return alert('Informe o preço de venda')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase
      .from('usuarios').select('empresa_id').eq('id', user!.id).single()

    const { error } = await supabase.from('produtos').insert({
      empresa_id: usuario!.empresa_id,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      custo_materiais: parseFloat(form.custo_materiais) || 0,
      custo_adicional: parseFloat(form.custo_adicional) || 0,
      preco_venda: preco,
      estoque: 0,
      ativo: true,
    })

    if (error) { alert('Erro: ' + error.message); setLoading(false); return }
    router.push('/produtos')
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/produtos" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Novo Produto</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dados do produto</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => set('nome', e.target.value)}
            placeholder="Ex: Kit Especial (15 fotos)"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
          <textarea
            value={form.descricao}
            onChange={e => set('descricao', e.target.value)}
            placeholder="Detalhes do produto..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>
      </div>

      {/* Calculadora */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-green-600" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Custos</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Insumo (R$) <span className="text-gray-400 font-normal">— imãs, materiais</span>
          </label>
          <input
            type="number"
            value={form.custo_materiais}
            onChange={e => set('custo_materiais', e.target.value)}
            placeholder="Ex: 18,00"
            step="0.01" min="0"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Embalagem + outros (R$) <span className="text-gray-400 font-normal">— caixa, saquinhos, lacre...</span>
          </label>
          <input
            type="number"
            value={form.custo_adicional}
            onChange={e => set('custo_adicional', e.target.value)}
            placeholder="Ex: 2,25"
            step="0.01" min="0"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Preço de venda (R$) *</label>
          <input
            type="number"
            value={form.preco_venda}
            onChange={e => set('preco_venda', e.target.value)}
            placeholder="Ex: 69,90"
            step="0.01" min="0"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Resultado */}
      {preco > 0 && (
        <div className="bg-green-600 rounded-2xl p-5 mb-6 text-white">
          <p className="text-sm text-green-200 mb-3 font-medium">Resultado</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-green-200">Custo total</span>
              <span className="font-semibold">{fmt(custoTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-green-200">Margem</span>
              <span className="font-semibold">{margem.toFixed(1)}%</span>
            </div>
            <div className="border-t border-green-500 my-2" />
            <div className="flex justify-between items-center">
              <span className="text-green-100 font-medium">Lucro por venda</span>
              <span className="text-2xl font-bold">{fmt(lucro)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="pb-24">
        <button
          onClick={salvar}
          disabled={loading}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? 'Salvando...' : 'Salvar Produto'}
        </button>
      </div>
    </div>
  )
}
