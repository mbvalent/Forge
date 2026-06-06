import { BottomNav } from '@/components/nav/bottom-nav'
import { Sidebar } from '@/components/nav/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <BottomNav className="md:hidden" />
    </div>
  )
}
