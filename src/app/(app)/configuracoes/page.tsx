'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Building2, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase
        .from('usuarios')
        .select('*, empresas(*)')
        .eq('id', user.id)
        .single()
      setUsuario(u)
      setEmpresa(u?.empresas)
      setLoading(false)
    }
    carregar()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4">
      <div className="pt-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Empresa</p>
        </div>
        <div className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Building2 size={22} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{empresa?.nome || 'Reviva'}</p>
            <p className="text-sm text-gray-500">{empresa?.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Meu perfil</p>
        </div>
        <div className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-blue-700 font-bold text-sm">
              {usuario?.nome?.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{usuario?.nome}</p>
            <p className="text-sm text-gray-500">{usuario?.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sistema</p>
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <span className="text-sm text-gray-700">Versão</span>
          <span className="text-sm text-gray-400">MVP 1.0</span>
        </div>
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-700">Banco de dados</span>
          <span className="text-sm text-green-600 font-medium">● Conectado</span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-between bg-white rounded-2xl border border-red-100 p-4 shadow-sm text-red-500 hover:bg-red-50 active:scale-95 transition-all"
      >
        <div className="flex items-center gap-3">
          <LogOut size={20} />
          <span className="font-medium">Sair da conta</span>
        </div>
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
