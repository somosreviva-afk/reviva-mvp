'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Users, ShoppingBag, DollarSign } from 'lucide-react'

const ITENS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { href: '/produtos', icon: Package, label: 'Produtos' },
  { href: '/clientes', icon: Users, label: 'Clientes' },
  { href: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
  { href: '/financeiro', icon: DollarSign, label: 'Caixa' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 safe-pb">
        {ITENS.map(({ href, icon: Icon, label }) => {
          const ativo = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px] ${
                ativo ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <Icon size={22} strokeWidth={ativo ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
