import { createClient } from '@/lib/supabase/server'

const SOCIAS = [
  { nome: 'Leticia', emoji: '👩‍💼', cor: 'bg-pink-50 border-pink-200 text-[#b5005e]' },
  { nome: 'Ana',     emoji: '👩‍🎨', cor: 'bg-purple-50 border-purple-200 text-purple-700' },
  { nome: 'Reviva',  emoji: '💚',   cor: 'bg-green-50 border-green-200 text-green-700' },
]

// Saldo de abertura (caixa do dia 10/08/2026) e data de início da divisão
const SALDO_ABERTURA = 363.92
const DATA_INICIO    = '2026-08-10'

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

  // Só pedidos pagos a partir de hoje (não conta o histórico antigo)
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id, created_at, valor_total, tipo, pago, numero, clientes(nome)')
    .eq('empresa_id', empresaId)
    .eq('pago', true)
    .neq('tipo', 'mimo')
    .neq('status', 'cancelado')
    .gte('created_at', DATA_INICIO)
    .order('created_at', { ascending: false })

  const lista = pedidos || []

  // Total = saldo de abertura + valor inteiro de cada pedido novo
  const totalPedidos = lista.reduce((s, p) => s + Number(p.valor_total || 0), 0)
  const totalGeral   = SALDO_ABERTURA + totalPedidos
  const porSocia     = totalGeral / 3

  // Agrupar por mês
  const porMes: Record<string, { mes: string; total: number; pedidos: typeof lista }> = {}
  for (const p of lista) {
    const d = new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`
    const label = nomeMes(d.getMonth(), d.getFullYear())
    if (!porMes[key]) porMes[key] = { mes: label, total: 0, pedidos: [] }
    porMes[key].total += Number(p.valor_total || 0)
    porMes[key].pedidos.push(p)
  }
  const meses = Object.values(porMes)

  return (
    <div className="p-4 pb-24">
      <div className="pt-4 mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Divisão de Lucros</h1>
        <p className="text-xs text-gray-400 mt-0.5">1/3 para cada sócia · a partir de 10/08/2026</p>
      </div>

      {/* Card total */}
      <div className="bg-gradient-to-br from-[#b5005e] to-pink-500 rounded-2xl p-5 mb-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">Total acumulado</p>
        <p className="text-3xl font-bold">{fmt(totalGeral)}</p>
        <div className="flex gap-4 mt-2 text-xs opacity-80">
          <span>Saldo de abertura: {fmt(SALDO_ABERTURA)}</span>
          {lista.length > 0 && <span>+ {lista.length} pedido{lista.length !== 1 ? 's' : ''}</span>}
        </div>
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

      {/* Saldo de abertura */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Saldo de abertura</p>
            <p className="text-xs text-gray-400">10/08/2026 — base inicial</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-green-600">{fmt(SALDO_ABERTURA)}</p>
            <p className="text-xs text-gray-400">{fmt(SALDO_ABERTURA / 3)} cada</p>
          </div>
        </div>
      </div>

      {/* Pedidos novos por mês */}
      {meses.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-gray-500 text-sm">Novos pedidos aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meses.map(m => (
            <div key={m.mes} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{m.mes}</p>
                <p className="text-sm font-bold text-gray-900">{fmt(m.total)}</p>
              </div>

              {/* Mini divisão do mês */}
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                {SOCIAS.map(s => (
                  <div key={s.nome} className="p-3 text-center">
                    <p className="text-[10px] text-gray-400 mb-0.5">{s.nome}</p>
                    <p className="text-xs font-bold text-gray-800">{fmt(m.total / 3)}</p>
                  </div>
                ))}
              </div>

              {/* Pedidos */}
              <div className="divide-y divide-gray-50">
                {m.pedidos.map(p => (
                  <div key={p.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">
                        #{p.numero} — {(p.clientes as any)?.nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-green-600">{fmt(Number(p.valor_total))}</p>
                      <p className="text-[10px] text-gray-400">{fmt(Number(p.valor_total) / 3)} cada</p>
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
