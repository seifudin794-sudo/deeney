'use client'

import { LayoutDashboard, CheckSquare, PlusCircle, Sun, Moon, LogOut } from 'lucide-react'
import { useUI, ViewKey } from '@/store/ui'
import { useTheme } from 'next-themes'
import { useLogout } from '@/hooks/use-data'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const NAV: { key: ViewKey; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'marker', label: 'Task Marker', icon: CheckSquare },
  { key: 'adder', label: 'Task Adder', icon: PlusCircle },
]

export function TopBar() {
  const { view, setView } = useUI()
  const { theme, setTheme } = useTheme()
  const logout = useLogout()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => toast.success('Signed out') })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CheckSquare className="h-5 w-5" />
          </div>
          <span className="hidden text-base font-semibold text-text sm:block">Deeney</span>
        </div>

        <nav className="mx-auto flex rounded-xl bg-muted p-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.key
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:px-4',
                  active ? 'bg-card text-text shadow-sm' : 'text-text-muted hover:text-text',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted transition hover:text-text"
          aria-label="Toggle theme"
        >
          {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={handleLogout}
          disabled={logout.isPending}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted transition hover:text-danger disabled:opacity-60"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

export function BottomBar() {
  const { view, setView } = useUI()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAV.map((item) => {
        const Icon = item.icon
        const active = view === item.key
        return (
          <button
            key={item.key}
            onClick={() => setView(item.key)}
            className={cn(
              'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
              active ? 'text-primary' : 'text-text-muted',
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
