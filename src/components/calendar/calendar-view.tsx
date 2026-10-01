'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useHeatmap, useSettings } from '@/hooks/use-data'
import { useUI } from '@/store/ui'
import { PageHeader, LoadingCard } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { monthName, startOfMonth, endOfMonth, addMonths, parseDateOnly, parseDateOnlyStr, todayDateOnly, startOfWeek } from '@/lib/date'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function CalendarView() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const { data: heatmap, isLoading } = useHeatmap()
  const { openDayDrawer } = useUI()
  const { data: settings } = useSettings()
  const weekStartsOn = (settings?.weekStartsOn ?? 1) as 0 | 1

  const dayMap = useMemo(() => new Map((heatmap || []).map((d) => [d.date, d])), [heatmap])

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), weekStartsOn)
    const end = endOfMonth(cursor)
    const gridStart = start
    const days: Date[] = []
    const d = new Date(gridStart)
    while (d <= end || days.length % 7 !== 0) {
      days.push(new Date(d))
      d.setDate(d.getDate() + 1)
      if (days.length > 42) break
    }
    const ws: Date[][] = []
    for (let i = 0; i < days.length; i += 7) ws.push(days.slice(i, i + 7))
    return ws
  }, [cursor, weekStartsOn, dayMap])

  const monthStats = useMemo(() => {
    const monthDays = (heatmap || []).filter((d) => d.date.startsWith(parseDateOnlyStr(cursor).slice(0, 7)))
    const completed = monthDays.reduce((a, d) => a + d.completed, 0)
    const total = monthDays.reduce((a, d) => a + d.completed + d.skipped + d.pending, 0)
    return { completed, total }
  }, [heatmap, cursor])

  const weekdayHeader = weekStartsOn === 1
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-5">
      <PageHeader title="Calendar" subtitle="A month at a glance. Click any day for the full journal entry.">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor((c) => addMonths(c, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{monthName(parseDateOnly(parseDateOnlyStr(cursor)).getMonth())} {parseDateOnly(parseDateOnlyStr(cursor)).getFullYear()}</h2>
          <span className="tnum text-xs text-text-muted">
            {monthStats.completed} done · {monthStats.total} planned
          </span>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1.5">
          {weekdayHeader.map((w) => (
            <div key={w} className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-text-muted">{w}</div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1.5">
                {week.map((day) => {
                  const key = parseDateOnlyStr(day)
                  const inMonth = day.getMonth() === cursor.getMonth()
                  const isToday = key === todayDateOnly()
                  const d = dayMap.get(key)
                  const completed = d?.completed || 0
                  const total = d ? d.completed + d.skipped + d.pending : 0
                  const future = day > new Date()
                  const rate = total ? completed / total : 0
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => openDayDrawer(key)}
                          className={cn(
                            'relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition',
                            inMonth ? 'border-border bg-surface hover:border-primary/40 hover:bg-muted/40' : 'border-transparent text-text-muted/40',
                            isToday && 'border-primary ring-1 ring-primary/30',
                            future && 'opacity-50',
                          )}
                        >
                          <span className={cn('tnum', isToday ? 'font-bold text-primary' : inMonth ? 'text-text-primary' : 'text-text-muted/40')}>
                            {day.getDate()}
                          </span>
                          {total > 0 && (
                            <div className="mt-1 flex items-center gap-1">
                              <svg className="h-4 w-4 -rotate-90" viewBox="0 0 16 16">
                                <circle cx="8" cy="8" r="6" fill="none" stroke="var(--border)" strokeWidth="2" />
                                <circle
                                  cx="8" cy="8" r="6" fill="none"
                                  stroke={completed > 0 ? 'var(--success)' : 'var(--text-muted)'}
                                  strokeWidth="2"
                                  strokeDasharray={`${rate * 37.7} 37.7`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="tnum text-[10px] text-text-muted">{completed}</span>
                            </div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium">{day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                          {total > 0 ? (
                            <>
                              <div className="text-success">✓ {completed} done</div>
                              <div className="text-text-muted">{total} planned</div>
                            </>
                          ) : (
                            <div className="text-text-muted">No tasks</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
