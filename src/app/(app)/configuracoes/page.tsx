'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Building2, ChevronRight, Package, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CONFIG_PADRAO, type ConfigMateriais } from '@/lib/utils/custos'

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [materiais, setMateriais] = useState<ConfigMateriais>(CONFIG_PADRAO)
  const [salvandoMateriais, setSalvandoMateriais] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: u } = await supabase
        .from('usuarios').select('*, empresas(*)').eq('id', user.id).single()
      setUsuario(u)
      setEmpresa(u?.empresas)

      const { data: cfg } = await supabase
        .from('configuracoes_materiais')
        .select('*')
        .eq('empresa_id', u?.empresa_id)
        .single()

      if (cfg) {
        setMateriais({
          ima_custo: Number(cfg.ima_custo),
          caixa_custo: Number(cfg.caixa_custo),
          saquinho_custo: Number(cfg.saquinho_custo),
          envelope_custo: Number(cfg.envelope_custo),
          papel_seda_custo: Number(cfg.papel_seda_custo),
          cartao_custo: Number(cfg.cartao_custo),
          impressao_valor_folha: Number(cfg.impressao_valor_folha),
          impressao_fotos_por_folha: Number(cfg.impressao_fotos_por_folha),
        })
      }
      setLoading(false)
    }
    carregar()
  }, [])

  async function salvarMateriais() {
    setSalvandoMateriais(true)
    const supabase = createClient()
    await supabase.from('configuracoes_materiais').upsert({
      empresa_id: usuario?.empresa_id,
      ...materiais,
    }, { onConflict: 'empresa_id' })
    setSalvandoMateriais(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  function setM(key: keyof ConfigMateriais, val: string) {
    setMateriais(prev => ({ ...prev, [key]: parseFloat(val) || 0 }))
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const custoPorFoto = materiais.impressao_fotos_por_folha > 0
    ? materiais.impressao_valor_folha / materiais.impressao_fotos_por_folha
    : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const inputCls = "w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"

  return (
    <div className="p-4">
      <div className="pt-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      </div>

      {/* Empresa */}
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

      {/* Perfil */}
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

      {/* Materiais */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Package size={14} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Custo de Materiais</p>
        </div>
        <div className="p-4 space-y-3">
          {([
            { key: 'ima_custo', label: 'Ímã (por unidade)' },
            { key: 'caixa_custo', label: 'Caixa (por pedido)' },
            { key: 'saquinho_custo', label: 'Saquinho (por unidade)' },
            { key: 'envelope_custo', label: 'Envelope (por pedido)' },
            { key: 'papel_seda_custo', label: 'Papel Seda (por unidade)' },
            { key: 'cartao_custo', label: 'Cartão Reviva (por pedido)' },
          ] as { key: keyof ConfigMateriais; label: string }[]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{label}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={materiais[key]}
                  onChange={e => setM(key, e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Impressão */}
        <div className="px-4 pb-1 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 mb-3">
            <Printer size={13} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Impressão</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Valor da folha</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={materiais.impressao_valor_folha}
                  onChange={e => setM('impressao_valor_folha', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Fotos por folha</span>
              <input
                type="number"
                step="1"
                min="1"
                value={materiais.impressao_fotos_por_folha}
                onChange={e => setM('impressao_fotos_por_folha', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-gray-500">Custo por foto calculado</span>
              <span className="text-sm font-semibold text-green-700">
                R$ {custoPorFoto.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <button
            onClick={salvarMateriais}
            disabled={salvandoMateriais}
            className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {savedMsg ? '✓ Salvo!' : salvandoMateriais ? 'Salvando...' : 'Salvar configurações'}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Alterações valem para os próximos pedidos
          </p>
        </div>
      </div>

      {/* Sistema */}
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
