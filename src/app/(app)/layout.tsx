import { BottomNav } from '@/components/layout/BottomNav'
import { InactivityGuard } from '@/components/InactivityGuard'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <InactivityGuard />
      <main className="pb-20 max-w-lg mx-auto min-h-screen">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
