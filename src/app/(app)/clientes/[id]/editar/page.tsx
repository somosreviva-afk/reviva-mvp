'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ShoppingBag, Handshake, Gift } from 'lucide-react'
import Link from 'next/link'

type TipoCliente = 'venda' | 'parceria' | 'mimo'

const TIPOS: { value: TipoCliente; label: string; desc: string; color: string; icon: any }[] = [
  { value: 'venda',    label: 'Venda',    desc: 'Cliente final, pagamento normal', color: 'border-green-500 bg-green-50', icon: ShoppingBag },
  { value: 'parceria', label: 'Parceria', desc: 'Revende para outras clientes', color: 'border-blue-500 bg-blue-50', icon: Handshake },
  { value: 'mimo',     label: 'Mimo',     desc: 'Recebe brindes, nao entra no caixa', color: 'border-pink-500 bg-pink-50', icon: Gift },
]

export default function EditarClientePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [tipo, setTipo] = useState<TipoCliente>('venda')
  const [form, setForm] = useState({
    nome: '', whatsapp: '', email: '', cidade: '', estado: '', endereco: '', observacoes: '',
  })

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const { data: cliente } = await supabase.from('clientes').select('*').eq('id', id).eq('empresa_id', usuario!.empresa_id).single()
      if (cliente) {
        setTipo(cliente.tipo || 'venda')
        setForm({
          nome:        cliente.nome        || '',
          whatsapp:    cliente.whatsapp    || '',
          email:       cliente.email       || '',
          cidade:      cliente.cidade      || '',
          estado:      cliente.estado      || '',
          endereco:    cliente.endereco    || '',
          observacoes: cliente.observacoes || '',
        })
      }
      setLoading(false)
    }
    carregar()
  }, [id])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function salvar() {
    if (!form.nome.trim()) return alert('Informe o nome do cliente')
    setSalvando(true)
    const supabase = createClient()
    const { error } = await supabase.from('clientes').update({
      nome:        form.nome.trim(),
      whatsapp:    form.whatsapp.trim()    || null,
      email:       form.email.trim()       || null,
      cidade:      form.cidade.trim()      || null,
      estado:      form.estado.trim()      || null,
      endereco:    form.endereco.trim()    || null,
      observacoes: form.observacoes.trim() || null,
      tipo,
    }).eq('id', id)
    if (error) { alert('Erro ao salvar: ' + error.message); setSalvando(false); return }
    router.push(`/clientes/${id}`)
  }

  const tipoIcons: Record<TipoCliente, string> = { venda: 'text-green-600', parceria: 'text-blue-600', mimo: 'text-pink-500' }
  const tipoBg:    Record<TipoCliente, string> = { venda: 'bg-green-100',  parceria: 'bg-blue-100',  mimo: 'bg-pink-100' }
  const tipoRing:  Record<TipoCliente, string> = { venda: 'border-green-500 bg-green-500', parceria: 'border-blue-500 bg-blue-500', mimo: 'border-pink-500 bg-pink-500' }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <Link href={`/clientes/${id}`} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Editar Cliente</h1>
      </div>

      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-3">Tipo de cliente</label>
        <div className="space-y-2">
          {TIPOS.map(t => {
            const Icon = t.icon
            const ativo = tipo === t.value
            return (
              <button key={t.value} onClick={() => setTipo(t.value)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${ativo ? t.color : 'border-gray-100 bg-white'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ativo ? tipoBg[t.value] : 'bg-gray-100'}`}>
                  <Icon size={18} className={ativo ? tipoIcons[t.value] : 'text-gray-400'} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${ativo ? 'text-gray-900' : 'text-gray-600'}`}>{t.label}</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </div>
                <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${ativo ? tipoRing[t.value] : 'border-gray-300'}`}>
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
          <input type="text" value={form.nome} onChange={e => set('nome', e.target.value)}
            placeholder="Nome completo"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp</label>
          <input type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            placeholder="email@exemplo.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cidade</label>
            <input type="text" value={form.cidade} onChange={e => set('cidade', e.target.value)}
              placeholder="Ex: Sao Paulo"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
            <input type="text" value={form.estado} onChange={e => set('estado', e.target.value.toUpperCase())}
              placeholder="SP" maxLength={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 uppercase" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Endereco</label>
          <input type="text" value={form.endereco} onChange={e => set('endereco', e.target.value)}
            placeholder="Rua, numero, bairro..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Observacoes internas</label>
          <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
            placeholder="Ex: Prefere retirada. Gosta de embalagem para presente..."
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          <p className="text-xs text-gray-400 mt-1">Uso interno — nao fica visivel para o cliente.</p>
        </div>
      </div>

      <div className="mt-6 pb-24">
        <button onClick={salvar} disabled={salvando}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 active:scale-95 transition-all">
          {salvando ? 'Salvando...' : 'Salvar Alteracoes'}
        </button>
      </div>
    </div>
  )
}
