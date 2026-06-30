import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileText, CheckCircle, Clock, XCircle } from 'lucide-react'

const STATUS_INFO: Record<string, { label: string; cor: string; icone: any }> = {
  rascunho: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600', icone: FileText },
  enviado: { label: 'Enviado', cor: 'bg-yellow-100 text-yellow-700', icone: Clock },
  aprovado: { label: 'Aprovado', cor: 'bg-green-100 text-green-700', icone: CheckCircle },
  recusado: { label: 'Recusado', cor: 'bg-red-100 text-red-700', icone: XCircle },
  expirado: { label: 'Expirado', cor: 'bg-gray-100 text-gray-500', icone: XCircle },
}

export default async function OrcamentosPage() {
  const supabase = await createClient()
  const { data: orcamentos } = await supabase
    .from('eventos_orcamentos')
    .select('*')
    .order('criado_em', { ascending: false })

  function formatarData(d: string) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-purple-900">Orçamentos</h1>
          <p className="text-xs text-purple-500">{(orcamentos || []).length} orçamento{(orcamentos || []).length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/eventos/orcamentos/novo"
          className="bg-purple-600 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          Novo
        </Link>
      </div>

      {(orcamentos || []).length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">Nenhum orçamento ainda</p>
          <Link href="/eventos/orcamentos/novo" className="text-purple-600 text-sm font-medium mt-1 block">
            Criar primeiro orçamento →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(orcamentos || []).map((orc: any) => {
            const info = STATUS_INFO[orc.status] || STATUS_INFO.rascunho
            return (
              <Link key={orc.id} href={`/eventos/orcamentos/${orc.id}`} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:border-purple-200 transition-colors block">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-sm">{orc.numero}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${info.cor}`}>{info.label}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {orc.qtd_convidados ? `${orc.qtd_convidados} convidados` : '—'}
                    {orc.data_evento ? ` · ${formatarData(orc.data_evento)}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">
                    R$ {Number(orc.valor_final || orc.valor_sugerido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-gray-400">custo: R$ {Number(orc.custo_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
