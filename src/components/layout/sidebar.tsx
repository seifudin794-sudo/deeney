'use client'

import { BookOpenCheck, ChevronsLeft, ChevronsRight, HelpCircle, LogOut } from 'lucide-react'
import { NAV_ITEMS } from '@/lib/nav'
import { useUI } from '@/store/ui'
import { useLogout, useMe } from '@/hooks/use-data'
import { cn } from '@/lib/utils'
import { useGenerateRecurring } from '@/hooks/use-data'
import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export function Sidebar() {
  const { view, setView, sidebarCollapsed, toggleSidebar, setShortcutsOpen } = useUI()
  const { data: me } = useMe()
  const logout = useLogout()
  const generate = useGenerateRecurring()
  const { setTheme } = useTheme()

  // Keep upcoming recurring occurrences generated.
  useEffect(() => {
    generate.mutate()
  }, [])

  return (
    <aside
      className={cn(
        'hidden md:flex h-screen sticky top-0 shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200',
        sidebarCollapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BookOpenCheck className="h-5 w-5" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">Cadence</p>
            <p className="truncate text-[11px] text-text-muted">Task journal</p>
          </div>
        )}
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              title={item.label}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-muted hover:text-text-primary',
                sidebarCollapsed && 'justify-center px-0',
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              {!sidebarCollapsed && item.shortcut && (
                <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        <button
          onClick={() => setShortcutsOpen(true)}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-muted hover:text-text-primary',
            sidebarCollapsed && 'justify-center px-0',
          )}
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          {!sidebarCollapsed && <span>Shortcuts</span>}
          {!sidebarCollapsed && <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted">?</kbd>}
        </button>
        <button
          onClick={() => logout.mutate()}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-muted hover:text-text-primary',
            sidebarCollapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>
        {!sidebarCollapsed && me?.user && (
          <div className="mt-2 truncate px-3 text-[11px] text-text-muted">{me.user.email}</div>
        )}
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-elevated text-text-muted hover:text-text-primary md:flex"
      >
        {sidebarCollapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  )
}
