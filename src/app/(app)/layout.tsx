import { Sidebar } from '@/components/layout/Sidebar'
import { InactivityGuard } from '@/components/InactivityGuard'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <InactivityGuard />
      <Sidebar />

      {/* Desktop: ml-56 para compensar a sidebar fixa */}
      {/* Mobile: pt-14 para compensar a top bar fixa */}
      <main className="md:ml-56 pt-14 md:pt-0 min-h-screen">
        <div className="max-w-2xl mx-auto md:max-w-none">
          {children}
        </div>
      </main>
    </div>
  )
}
