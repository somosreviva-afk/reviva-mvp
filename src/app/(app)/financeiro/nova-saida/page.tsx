'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const CATEGORIAS = ['Matéria-prima', 'Embalagem', 'Frete', 'Marketing', 'Mão de obra', 'Aluguel', 'Energia', 'Outros']

export default function NovaSaidaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    categoria: 'Matéria-prima',
    data: new Date().toISOString().split('T')[0],
    observacoes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function salvar() {
    if (!form.descricao.trim()) return alert('Informe a descrição')
    if (!form.valor || parseFloat(form.valor) <= 0) return alert('Informe o valor')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase
      .from('usuarios').select('empresa_id').eq('id', user!.id).single()

    const { error } = await supabase.from('financeiro').insert({
      empresa_id: usuario!.empresa_id,
      tipo: 'saida',
      descricao: form.descricao.trim(),
      valor: parseFloat(form.valor),
      categoria: form.categoria,
      data: form.data,
      observacoes: form.observacoes.trim() || null,
    })

    if (error) { alert('Erro: ' + error.message); setLoading(false); return }
    router.push('/financeiro')
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/financeiro" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nova Saída</h1>
          <p className="text-xs text-red-500 font-medium">🔴 Despesa</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição *</label>
          <input
            type="text"
            value={form.descricao}
            onChange={e => set('descricao', e.target.value)}
            placeholder="Ex: Compra de embalagens"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$) *</label>
          <input
            type="number"
            value={form.valor}
            onChange={e => set('valor', e.target.value)}
            placeholder="0,00"
            step="0.01"
            min="0"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 text-lg font-bold"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
          <select
            value={form.categoria}
            onChange={e => set('categoria', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
          >
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
          <input
            type="date"
            value={form.data}
            onChange={e => set('data', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
          <textarea
            value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)}
            placeholder="Notas adicionais..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
      </div>

      <div className="mt-6 pb-24">
        <button
          onClick={salvar}
          disabled={loading}
          className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? 'Salvando...' : '🔴 Registrar Saída'}
        </button>
      </div>
    </div>
  )
}
