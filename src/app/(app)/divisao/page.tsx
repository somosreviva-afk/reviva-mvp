import { createClient } from '@/lib/supabase/server'

const SOCIAS = [
  { nome: 'Leticia', emoji: '👩‍💼', cor: 'bg-pink-50 border-pink-200 text-[#b5005e]' },
  { nome: 'Ana',     emoji: '👩‍🎨', cor: 'bg-purple-50 border-purple-200 text-purple-700' },
  { nome: 'Reviva',  emoji: '💚',   cor: 'bg-green-50 border-green-200 text-green-700' },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function nomeMes(mes: number, ano: number) {
  return new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default async function DivisaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: usuario } = await supabase
    .from('usuarios').select('empresa_id').eq('id', user!.id).single()
  const empresaId = usuario!.empresa_id

  // Todos os pedidos pagos (não mimo)
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, created_at, valor_total, custo_total_pedido, lucro_real, tipo, pago, numero, clientes(nome)')
    .eq('empresa_id', empresaId)
    .eq('pago', true)
    .neq('tipo', 'mimo')
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })

  const lista = pedidos || []

  // Lucro total acumulado
  const lucroTotal = lista.reduce((s, p) => s + Number(p.lucro_real || 0), 0)
  const porSocia = lucroTotal / 3

  // Agrupar por mês
  const porMes: Record<string, { mes: string; lucro: number; pedidos: typeof lista }> = {}
  for (const p of lista) {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`
    const label = nomeMes(d.getMonth(), d.getFullYear())
    if (!porMes[key]) porMes[key] = { mes: label, lucro: 0, pedidos: [] }
    porMes[key].lucro += Number(p.lucro_real || 0)
    porMes[key].pedidos.push(p)
  }
  const meses = Object.values(porMes)

  return (
    <div className="p-4 pb-24">
      <div className="pt-4 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Divisão de Lucros</h1>
        <p className="text-xs text-gray-400 mt-0.5">1/3 para cada sócia</p>
      </div>

      {/* Card total */}
      <div className="bg-gradient-to-br from-[#b5005e] to-pink-500 rounded-2xl p-5 mb-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">Lucro total acumulado</p>
        <p className="text-3xl font-bold">{fmt(lucroTotal)}</p>
        <p className="text-xs opacity-70 mt-1">{lista.length} pedido{lista.length !== 1 ? 's' : ''} pago{lista.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Cards por sócia */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {SOCIAS.map(s => (
          <div key={s.nome} className={`rounded-2xl border-2 p-3 text-center ${s.cor}`}>
            <div className="text-2xl mb-1">{s.emoji}</div>
            <p className="text-xs font-bold mb-1">{s.nome}</p>
            <p className="text-sm font-bold">{fmt(porSocia)}</p>
          </div>
        ))}
      </div>

      {/* Por mês */}
      {meses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💸</p>
          <p className="text-gray-500 font-medium">Nenhum pedido pago ainda</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meses.map(m => (
            <div key={m.mes} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{m.mes}</p>
                <p className="text-sm font-bold text-gray-900">{fmt(m.lucro)}</p>
              </div>

              {/* Mini divisão do mês */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 mb-2">
                {SOCIAS.map(s => (
                  <div key={s.nome} className="p-3 text-center">
                    <p className="text-[10px] text-gray-400 mb-0.5">{s.nome}</p>
                    <p className="text-xs font-bold text-gray-800">{fmt(m.lucro / 3)}</p>
                  </div>
                ))}
              </div>

              {/* Pedidos do mês */}
              <div className="divide-y divide-gray-50">
                {m.pedidos.map(p => (
                  <div key={p.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        #{p.numero} — {(p.clientes as any)?.nome}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Venda {fmt(Number(p.valor_total))} · Custo {fmt(Number(p.custo_total_pedido || 0))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-green-600">{fmt(Number(p.lucro_real || 0))}</p>
                      <p className="text-[10px] text-gray-400">{fmt(Number(p.lucro_real || 0) / 3)} cada</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
