'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    endereco: '',
    observacoes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function salvar() {
    if (!form.nome.trim()) return alert('Informe o nome do cliente')
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: usuario } = await supabase
      .from('usuarios').select('empresa_id').eq('id', user!.id).single()

    const { error } = await supabase.from('clientes').insert({
      empresa_id: usuario!.empresa_id,
      nome: form.nome.trim(),
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      endereco: form.endereco.trim() || null,
      observacoes: form.observacoes.trim() || null,
    })

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setLoading(false)
      return
    }
    router.push('/clientes')
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href="/clientes" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Novo Cliente</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => set('nome', e.target.value)}
            placeholder="Nome completo"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp</label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={e => set('whatsapp', e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder="email@exemplo.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Endereço</label>
          <input
            type="text"
            value={form.endereco}
            onChange={e => set('endereco', e.target.value)}
            placeholder="Rua, número, bairro..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
          <textarea
            value={form.observacoes}
            onChange={e => set('observacoes', e.target.value)}
            placeholder="Notas sobre o cliente..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>
      </div>

      <div className="mt-6 pb-24">
        <button
          onClick={salvar}
          disabled={loading}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? 'Salvando...' : 'Salvar Cliente'}
        </button>
      </div>
    </div>
  )
}
