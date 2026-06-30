'use client'

import { Printer } from 'lucide-react'

export function BotaoPrint() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-[#b5005e] text-white rounded-xl px-4 py-2 text-sm font-semibold shadow flex items-center gap-2"
    >
      <Printer size={15} />
      Baixar / Imprimir PDF
    </button>
  )
}
