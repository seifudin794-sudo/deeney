'use client'

import { useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { DayDetailDrawer } from '@/components/common/day-drawer'
import { ShortcutsHelp } from '@/components/common/shortcuts-help'
import { CloseOutDayModal } from '@/components/common/close-out-day'
import { useKeyboardShortcuts } from '@/hooks/use-shortcuts'
import { useSettings, useMe } from '@/hooks/use-data'
import { useTheme } from 'next-themes'
import { useUI } from '@/store/ui'
import { TodayView } from '@/components/today/today-view'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { TasksView } from '@/components/tasks/tasks-view'
import { CalendarView } from '@/components/calendar/calendar-view'
import { RecurringView } from '@/components/recurring/recurring-view'
import { CategoriesView } from '@/components/categories/categories-view'
import { SettingsView } from '@/components/settings/settings-view'
import { Sparkles, HelpCircle } from 'lucide-react'

export function AppShell() {
  const { view, setView } = useUI()
  const { data: settings } = useSettings()
  const { setTheme } = useTheme()

  // Apply theme from user settings.
  useEffect(() => {
    if (settings?.theme) setTheme(settings.theme)
  }, [settings?.theme, setTheme])

  useKeyboardShortcuts(
    () => window.dispatchEvent(new CustomEvent('app:new-task')),
    () => window.dispatchEvent(new CustomEvent('app:focus-search')),
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 px-4 pb-28 pt-4 sm:px-6 md:pb-12">
            <div className="mx-auto w-full max-w-6xl">{renderView(view, setView)}</div>
          </div>
          <Footer />
        </main>
      </div>

      <MobileTabBar />
      <DayDetailDrawer />
      <ShortcutsHelp />
      <CloseOutDayModal />
    </div>
  )
}

function renderView(view: string, setView: (v: any) => void) {
  switch (view) {
    case 'today':
      return <TodayView />
    case 'dashboard':
      return <DashboardView />
    case 'tasks':
      return <TasksView />
    case 'calendar':
      return <CalendarView />
    case 'recurring':
      return <RecurringView />
    case 'categories':
      return <CategoriesView />
    case 'settings':
      return <SettingsView />
    default:
      return <TodayView />
  }
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" /> Cadence — your personal task journal
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border border-border px-1.5 py-0.5">?</kbd>
          for shortcuts
        </span>
      </div>
    </footer>
  )
}
