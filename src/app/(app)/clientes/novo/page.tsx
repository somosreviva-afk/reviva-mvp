'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShoppingBag, Handshake, Gift } from 'lucide-react'
import Link from 'next/link'

type TipoCliente = 'venda' | 'parceria' | 'mimo'

const TIPOS: { value: TipoCliente; label: string; desc: string; color: string; icon: any }[] = [
  {
    value: 'venda',
    label: 'Venda',
    desc: 'Cliente final, pagamento normal',
    color: 'border-green-500 bg-green-50',
    icon: ShoppingBag,
  },
  {
    value: 'parceria',
    label: 'Parceria',
    desc: 'Revende para outras clientes, embrulhos separados',
    color: 'border-blue-500 bg-blue-50',
    icon: Handshake,
  },
  {
    value: 'mimo',
    label: 'Mimo',
    desc: 'Recebe brindes, nao entra no caixa',
    color: 'border-pink-500 bg-pink-50',
    icon: Gift,
  },
]

export default function NovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tipo, setTipo] = useState<TipoCliente>('venda')
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
      tipo,
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

      {/* Tipo de cliente */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de cliente *</label>
        <div className="space-y-2">
          {TIPOS.map(t => {
            const Icon = t.icon
            const ativo = tipo === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                  ativo ? t.color : 'border-gray-100 bg-white'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  ativo
                    ? t.value === 'venda' ? 'bg-green-100' : t.value === 'parceria' ? 'bg-blue-100' : 'bg-pink-100'
                    : 'bg-gray-100'
                }`}>
                  <Icon size={18} className={
                    ativo
                      ? t.value === 'venda' ? 'text-green-600' : t.value === 'parceria' ? 'text-blue-600' : 'text-pink-500'
                      : 'text-gray-400'
                  } />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${ativo ? 'text-gray-900' : 'text-gray-600'}`}>{t.label}</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </div>
                <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  ativo
                    ? t.value === 'venda' ? 'border-green-500 bg-green-500' : t.value === 'parceria' ? 'border-blue-500 bg-blue-500' : 'border-pink-500 bg-pink-500'
                    : 'border-gray-300'
                }`}>
                  {ativo && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            )
          })}
        </div>
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
