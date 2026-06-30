'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { CheckCircle } from 'lucide-react'

type CheckItem = {
  id: string
  item: string
  concluido: boolean
  categoria: string
}

export function EventoAcoesClient({ eventoId, checklists }: { eventoId: string; checklists: CheckItem[] }) {
  const [items, setItems] = useState(checklists)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function toggleItem(id: string, concluido: boolean) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, concluido: !concluido } : i))
    await supabase
      .from('eventos_checklists')
      .update({ concluido: !concluido, concluido_em: !concluido ? new Date().toISOString() : null })
      .eq('id', id)
  }

  return (
    <div className="space-y-2">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => toggleItem(item.id, item.concluido)}
          className="w-full flex items-center gap-3 text-left py-2 border-b border-gray-50 last:border-0"
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            item.concluido ? 'bg-green-500' : 'border-2 border-gray-300'
          }`}>
            {item.concluido && <CheckCircle size={12} className="text-white" />}
          </div>
          <span className={`text-sm ${item.concluido ? 'line-through text-gray-400' : 'text-gray-700'}`}>
            {item.item}
          </span>
        </button>
      ))}
    </div>
  )
}
