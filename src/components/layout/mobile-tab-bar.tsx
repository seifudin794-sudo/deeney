'use client'

import { NAV_ITEMS } from '@/lib/nav'
import { useUI } from '@/store/ui'
import { cn } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useState } from 'react'

export function MobileTabBar() {
  const { view, setView } = useUI()
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = NAV_ITEMS.filter((n) => ['today', 'dashboard', 'tasks', 'calendar'].includes(n.key))
  const secondary = NAV_ITEMS.filter((n) => ['recurring', 'categories', 'settings'].includes(n.key))

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]">
        {primary.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-text-muted',
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          )
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors',
                secondary.some((s) => s.key === view) ? 'text-primary' : 'text-text-muted',
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="grid grid-cols-3 gap-2 pb-2">
              {secondary.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setView(item.key)
                      setMoreOpen(false)
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border border-border py-4 text-xs font-medium',
                      view === item.key ? 'text-primary' : 'text-text-secondary',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  )
}
