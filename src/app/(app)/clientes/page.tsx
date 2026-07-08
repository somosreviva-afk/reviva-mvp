'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/formatters'
import { Plus, Users, Search, Phone, MapPin } from 'lucide-react'
import Link from 'next/link'

type Filtro = 'todos' | 'ativos' | 'inativos'

function isAtivo(lastPurchase: string | null): boolean {
  if (!lastPurchase) return false
  return Date.now() - new Date(lastPurchase).getTime() < 90 * 24 * 60 * 60 * 1000
}

function fmtUltimaCompra(dateStr: string | null): string {
  if (!dateStr) return 'sem compras'
  const dias = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `ha ${dias}d`
  const m = Math.floor(dias / 30)
  if (m < 12) return `ha ${m}m`
  return `ha ${Math.floor(m / 12)}a`
}

const digitos = (s: string) => (s || '').replace(/[^0-9]/g, '')

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [ultimaCompra, setUltimaCompra] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: usuario } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user!.id).single()
      const eid = usuario!.empresa_id

      const [{ data: cls }, { data: peds }] = await Promise.all([
        supabase.from('clientes').select('*').eq('empresa_id', eid).order('nome'),
        supabase.from('pedidos')
          .select('cliente_id, created_at')
          .eq('empresa_id', eid)
          .neq('status', 'cancelado')
          .order('created_at', { ascending: false }),
      ])

      const lastMap: Record<string, string> = {}
      for (const p of peds || []) {
        if (!lastMap[p.cliente_id]) lastMap[p.cliente_id] = p.created_at
      }

      setClientes(cls || [])
      setUltimaCompra(lastMap)
      setLoading(false)
    }
    carregar()
  }, [])

  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString()
  const totalClientes    = clientes.length
  const clientesAtivos   = clientes.filter(c => isAtivo(ultimaCompra[c.id] ?? null)).length
  const clientesNovos    = clientes.filter(c => c.created_at >= inicioMes).length
  const clientesRecorr   = clientes.filter(c => Number(c.num_pedidos ?? 0) >= 2).length
  const faturamentoTotal = clientes.reduce((s, c) => s + Number(c.total_gasto ?? 0), 0)

  const lista = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return clientes.filter(c => {
      const ativo = isAtivo(ultimaCompra[c.id] ?? null)
      if (filtro === 'ativos' && !ativo) return false
      if (filtro === 'inativos' && ativo) return false
      if (!q) return true
      const matchNome = (c.nome || '').toLowerCase().includes(q)
      const matchTel  = digitos(c.whatsapp || '').includes(digitos(q))
      const matchCid  = (c.cidade || '').toLowerCase().includes(q)
      const matchEst  = (c.estado || '').toLowerCase().includes(q)
      const matchEnd  = (c.endereco || '').toLowerCase().includes(q)
      return matchNome || matchTel || matchCid || matchEst || matchEnd
    })
  }, [clientes, ultimaCompra, busca, filtro])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 pb-28">
      <div className="flex items-center justify-between pt-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 transition-all"
        >
          <Plus size={16} /> Novo
        </Link>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
          <p className="text-2xl font-bold text-gray-900">{totalClientes}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total de clientes</p>
        </div>
        <div className={`rounded-2xl border p-3.5 shadow-sm ${clientesAtivos > 0 ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
          <p className={`text-2xl font-bold ${clientesAtivos > 0 ? 'text-green-700' : 'text-gray-400'}`}>{clientesAtivos}</p>
          <p className="text-xs text-green-600 mt-0.5">Ativos (90 dias)</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
          <p className="text-2xl font-bold text-blue-600">{clientesNovos}</p>
          <p className="text-xs text-gray-400 mt-0.5">Novos este mes</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
          <p className="text-2xl font-bold text-purple-600">{clientesRecorr}</p>
          <p className="text-xs text-gray-400 mt-0.5">Recorrentes (2+)</p>
        </div>
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
          <p className="text-xl font-bold text-gray-900">{formatCurrency(faturamentoTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Faturamento total por clientes</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Nome, telefone ou cidade..."
          className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl mb-4">
        {(['todos', 'ativos', 'inativos'] as Filtro[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              filtro === f ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            {f === 'todos' ? 'Todos' : f === 'ativos' ? 'Ativos' : 'Inativos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {busca || filtro !== 'todos' ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </p>
          {!busca && filtro === 'todos' && (
            <Link href="/clientes/novo"
              className="inline-block mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium">
              Cadastrar primeiro cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {lista.map(c => {
            const last  = ultimaCompra[c.id] ?? null
            const ativo = isAtivo(last)
            const numP  = Number(c.num_pedidos ?? 0)
            const total = Number(c.total_gasto ?? 0)
            const local = [c.cidade, c.estado].filter(Boolean).join(' / ')

            return (
              <Link key={c.id} href={`/clientes/${c.id}`}
                className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-all">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                    ativo ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <span className={`font-bold text-sm ${ativo ? 'text-green-700' : 'text-gray-500'}`}>
                      {c.nome.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{c.nome}</h3>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ativo ? 'bg-green-500' : 'bg-yellow-400'}`} />
                      {c.tipo === 'parceria' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">Parceria</span>
                      )}
                      {c.tipo === 'mimo' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600">Mimo</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1.5">
                      {c.whatsapp && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <Phone size={10} className="shrink-0" /> {c.whatsapp}
                        </span>
                      )}
                      {local && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <MapPin size={10} className="shrink-0" /> {local}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{numP} pedido{numP !== 1 ? 's' : ''}</span>
                      {total > 0 && (
                        <span className="text-xs font-semibold text-green-600">{formatCurrency(total)}</span>
                      )}
                      {last && (
                        <span className="text-xs text-gray-400">{fmtUltimaCompra(last)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
