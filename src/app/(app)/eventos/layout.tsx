import Link from 'next/link'
import { ArrowLeft, LayoutDashboard, Calendar, FileText, Users, Kanban, DollarSign, Package, ClipboardList, BarChart2, Settings, Calculator } from 'lucide-react'

const MENU = [
  { href: '/eventos', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/eventos/agenda', icon: Calendar, label: 'Agenda' },
  { href: '/eventos/crm', icon: Kanban, label: 'CRM' },
  { href: '/eventos/orcamentos', icon: FileText, label: 'Orçamentos' },
  { href: '/eventos/calculadora', icon: Calculator, label: 'Calculadora' },
  { href: '/eventos/clientes', icon: Users, label: 'Clientes' },
  { href: '/eventos/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/eventos/equipamentos', icon: Package, label: 'Equipamentos' },
  { href: '/eventos/checklists', icon: ClipboardList, label: 'Checklists' },
  { href: '/eventos/relatorios', icon: BarChart2, label: 'Relatórios' },
  { href: '/eventos/configuracoes', icon: Settings, label: 'Config.' },
]

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-purple-50">
      {/* Sub-navbar de eventos */}
      <div className="bg-purple-700 text-white sticky top-0 z-40">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-600">
          <Link href="/dashboard" className="p-1 rounded-lg hover:bg-purple-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className="text-sm font-semibold">🎉 Reviva Eventos</span>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 px-2 py-1.5 min-w-max">
            {MENU.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-purple-200 hover:bg-purple-600 hover:text-white transition-colors text-xs whitespace-nowrap"
              >
                <Icon size={13} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="pb-20">
        {children}
      </div>
    </div>
  )
}
