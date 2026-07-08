'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Users, DollarSign,
  Package, Settings, PartyPopper, BarChart2, X, Menu,
  Layers, Archive, TrendingUp
} from 'lucide-react'

const MENU = [
  {
    section: 'PRINCIPAL',
    items: [
      { href: '/dashboard',  icon: LayoutDashboard, label: 'Início' },
      { href: '/relatorios', icon: TrendingUp,       label: 'BI / Relatórios' },
    ],
  },
  {
    section: 'VENDAS',
    items: [
      { href: '/pedidos',  icon: ShoppingBag, label: 'Pedidos' },
      { href: '/clientes', icon: Users,        label: 'Clientes' },
    ],
  },
  {
    section: 'FINANCEIRO',
    items: [
      { href: '/financeiro', icon: DollarSign, label: 'Caixa' },
    ],
  },
  {
    section: 'ESTOQUE',
    items: [
      { href: '/estoque', icon: Layers, label: 'Estoque' },
      { href: '/materiais', icon: Package, label: 'Materiais' },
      { href: '/produtos', icon: Archive, label: 'Produtos' },
    ],
  },
  {
    section: 'EVENTOS',
    items: [
      { href: '/eventos', icon: PartyPopper, label: 'Eventos' },
    ],
  },
  {
    section: 'SISTEMA',
    items: [
      { href: '/configuracoes', icon: Settings, label: 'Configurações' },
    ],
  },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-pink-100">
        <div>
          <p className="text-lg font-bold text-[#b5005e] leading-tight">Reviva Imãs</p>
          <p className="text-[10px] text-pink-400 font-medium tracking-wide">gestão do ateliê</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {MENU.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest px-2 mb-1.5">{section}</p>
            <div className="space-y-0.5">
              {items.map(({ href, icon: Icon, label }) => {
                const ativo = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      ativo
                        ? 'bg-[#b5005e] text-white shadow-sm shadow-pink-200'
                        : 'text-gray-600 hover:bg-pink-50 hover:text-[#b5005e]'
                    }`}
                  >
                    <Icon size={17} strokeWidth={ativo ? 2.2 : 1.8} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-pink-100">
        <p className="text-[10px] text-gray-400">@somos_reviva</p>
        <p className="text-[10px] text-gray-300">somosreviva@gmail.com</p>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // fecha o menu ao navegar
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <>
      {/* ── DESKTOP: sidebar fixa ── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-56 bg-white border-r border-pink-100 flex-col z-40 shadow-sm">
        <SidebarContent />
      </aside>

      {/* ── MOBILE: top bar ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-pink-100 flex items-center justify-between px-4 h-14 shadow-sm">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl text-[#b5005e] hover:bg-pink-50 transition-colors"
        >
          <Menu size={22} />
        </button>
        <p className="text-base font-bold text-[#b5005e]">Reviva Imãs</p>
        <div className="w-9" /> {/* spacer */}
      </header>

      {/* ── MOBILE: overlay + drawer ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* fundo escuro */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* drawer */}
          <aside className="relative w-64 max-w-[80vw] h-full bg-white shadow-xl flex flex-col">
            <SidebarContent onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
