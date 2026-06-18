'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Package, Boxes } from 'lucide-react'
import Link from 'next/link'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPercent(value: number) {
  return `${Number(value).toFixed(1)}%`
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setErro('Não autenticado'); setLoading(false); return }

        const { data: usuario } = await supabase
          .from('usuarios').select('empresa_id').eq('id', user.id).single()
        if (!usuario) { setErro('Usuário não encontrado'); setLoading(false); return }

        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .eq('empresa_id', usuario.empresa_id)
          .eq('ativo', true)
          .order('nome')

        if (error) { setErro(error.message); setLoading(false); return }
        setProdutos(data || [])
        setLoading(false)
      } catch (e: any) {
        setErro(e.message || 'Erro desconhecido')
        setLoading(false)
      }
    }
    carregar()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (erro) return (
    <div className="p-4 pt-8">
      <p className="text-red-500 text-sm bg-red-50 rounded-xl p-3">Erro: {erro}</p>
    </div>
  )

  return (
    <div className="p-4">
      <div className="flex items-center justify-between pt-4 mb-3">
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <Link
          href="/produtos/novo"
          className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          Novo
        </Link>
      </div>

      {/* Link para estoque de insumos */}
      <Link
        href="/estoque"
        className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Boxes size={18} className="text-orange-500" />
          <span className="text-sm font-semibold text-gray-700">📦 Estoque de Insumos</span>
        </div>
        <span className="text-xs text-gray-400">Ver →</span>
      </Link>

      {produtos.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum produto cadastrado</p>
          <p className="text-gray-400 text-sm mt-1">Cadastre seu primeiro produto</p>
          <Link
            href="/produtos/novo"
            className="inline-block mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium"
          >
            Cadastrar produto
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {produtos.map((produto) => (
            <Link
              key={produto.id}
              href={`/produtos/${produto.id}`}
              className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-95 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Package size={24} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{produto.nome}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(produto.preco_venda)}
                    </span>
                    <span className="text-xs text-gray-400">
                      Custo: {formatCurrency(produto.custo_total)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="text-sm font-medium text-green-600">
                      💚 {formatCurrency(produto.lucro_unitario)} ({formatPercent(produto.margem_lucro)})
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      produto.estoque === 0
                        ? 'bg-red-100 text-red-600'
                        : produto.estoque <= 3
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      Estoque: {produto.estoque} un
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
