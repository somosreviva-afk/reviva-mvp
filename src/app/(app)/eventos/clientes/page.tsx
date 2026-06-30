'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Phone, Instagram, Search, User } from 'lucide-react'

type Cliente = {
  id: string
  nome: string
  telefone: string
  email: string
  instagram: string
  cidade: string
  observacoes: string
}

export default function ClientesEventosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [showNovo, setShowNovo] = useState(false)
  const [novo, setNovo] = useState({ nome: '', telefone: '', email: '', instagram: '', cidade: '', observacoes: '' })
  const [salvando, setSalvando] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('eventos_clientes').select('*').order('nome')
    setClientes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    if (!novo.nome.trim()) return
    setSalvando(true)
    await supabase.from('eventos_clientes').insert(novo)
    await carregar()
    setNovo({ nome: '', telefone: '', email: '', instagram: '', cidade: '', observacoes: '' })
    setShowNovo(false)
    setSalvando(false)
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone?.includes(busca) ||
    c.cidade?.toLowerCase().includes(busca.toLowerCase())
  )

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-purple-900">Clientes de Eventos</h1>
          <p className="text-xs text-purple-500">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowNovo(true)}
          className="bg-purple-600 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          Novo
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400"
          placeholder="Buscar por nome, telefone ou cidade..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
            <User size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">{busca ? 'Nenhum resultado' : 'Nenhum cliente ainda'}</p>
          </div>
        ) : (
          filtrados.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{c.nome}</p>
                  {c.cidade && <p className="text-xs text-gray-500">{c.cidade}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                {c.telefone && (
                  <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`} className="flex items-center gap-1 text-green-600">
                    <Phone size={11} />{c.telefone}
                  </a>
                )}
                {c.instagram && (
                  <span className="flex items-center gap-1 text-pink-500">
                    <Instagram size={11} />{c.instagram}
                  </span>
                )}
                {c.email && <span>{c.email}</span>}
              </div>
              {c.observacoes && <p className="text-xs text-gray-400 mt-2 italic">{c.observacoes}</p>}
            </div>
          ))
        )}
      </div>

      {showNovo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-3xl w-full p-6 space-y-3 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800">Novo Cliente</h2>
            {[
              { campo: 'nome', label: 'Nome *', type: 'text', placeholder: 'Nome completo' },
              { campo: 'telefone', label: 'Telefone / WhatsApp', type: 'tel', placeholder: '(11) 99999-9999' },
              { campo: 'email', label: 'E-mail', type: 'email', placeholder: 'email@email.com' },
              { campo: 'instagram', label: 'Instagram', type: 'text', placeholder: '@perfil' },
              { campo: 'cidade', label: 'Cidade', type: 'text', placeholder: 'São Paulo' },
              { campo: 'observacoes', label: 'Observações', type: 'text', placeholder: 'Notas sobre o cliente' },
            ].map(({ campo, label, type, placeholder }) => (
              <div key={campo}>
                <label className="text-xs font-medium text-gray-600">{label}</label>
                <input
                  type={type}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={(novo as any)[campo]}
                  onChange={e => setNovo(p => ({ ...p, [campo]: e.target.value }))}
                  placeholder={placeholder}
                />
              </div>
            ))}
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
