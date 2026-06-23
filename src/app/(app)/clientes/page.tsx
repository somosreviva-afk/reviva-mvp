import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/formatters'
import { Plus, Users, Phone } from 'lucide-react'
import Link from 'next/link'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('empresa_id')
    .eq('id', user!.id)
    .single()

  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', usuario!.empresa_id)
    .order('nome')

  return (
    <div className="p-4">
      <div className="flex items-center justify-between pt-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Link
          href="/clientes/novo"
          className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          Novo
        </Link>
      </div>

      {!clientes || clientes.length === 0 ? (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhum cliente cadastrado</p>
          <Link
            href="/clientes/novo"
            className="inline-block mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-medium"
          >
            Cadastrar cliente
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {clientes.map((cliente) => (
            <Link
              key={cliente.id}
              href={`/clientes/${cliente.id}`}
              className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-700 font-bold text-sm">
                    {cliente.nome.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-gray-900 truncate">{cliente.nome}</h3>
                    {cliente.tipo === 'parceria' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 flex-shrink-0">Parceria</span>
                    )}
                    {cliente.tipo === 'mimo' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-600 flex-shrink-0">Mimo</span>
                    )}
                  </div>
                  {cliente.whatsapp && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone size={12} />
                      {cliente.whatsapp}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{cliente.num_pedidos} pedidos</p>
                  <p className="text-sm font-semibold text-green-600 mt-0.5">
                    {formatCurrency(cliente.total_gasto)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
