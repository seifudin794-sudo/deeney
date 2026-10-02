'use client'

import { TopBar, BottomBar } from '@/components/layout/nav-bar'
import { useUI } from '@/store/ui'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { TaskMarkerView } from '@/components/marker/task-marker-view'
import { TaskAdderView } from '@/components/adder/task-adder-view'

export function AppShell() {
  const { view } = useUI()
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <main className="flex-1 px-4 pb-28 pt-6 md:pb-12">
        <div className="mx-auto w-full max-w-5xl">
          {view === 'dashboard' && <DashboardView />}
          {view === 'marker' && <TaskMarkerView />}
          {view === 'adder' && <TaskAdderView />}
        </div>
      </main>
      <footer className="mt-auto border-t border-border bg-card/40">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3 text-[11px] text-text-muted">
          <span>Deeney — personal task tracker</span>
          <span className="tnum">Africa/Nairobi</span>
        </div>
      </footer>
      <BottomBar />
    </div>
  )
}
