'use client'

import { useMemo, useState } from 'react'
import { useHeatmap, useSettings } from '@/hooks/use-data'
import { useUI } from '@/store/ui'
import { addDays, parseDateOnly, monthName, parseDateOnlyStr } from '@/lib/date'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// GitHub-style 12-month activity heatmap.
export function ActivityHeatmap() {
  const { data, isLoading } = useHeatmap()
  const { openDayDrawer } = useUI()
  const { data: settings } = useSettings()
  const weekStartsOn = (settings?.weekStartsOn ?? 1) as 0 | 1

  const { weeks, monthLabels } = useMemo(() => {
    if (!data) return { weeks: [], monthLabels: [] }
    const byDay = new Map(data.map((d) => [d.date, d]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = addDays(today, -364)
    // align start to week start
    const sd = new Date(start)
    const diff = (sd.getDay() - weekStartsOn + 7) % 7
    sd.setDate(sd.getDate() - diff)

    const weeks: { date: string; v: { completed: number; skipped: number; pending: number } | null; future: boolean }[][] = []
    const monthLabels: { label: string; col: number }[] = []
    let cursor = new Date(sd)
    let lastMonth = -1
    let col = 0
    while (cursor <= today) {
      const week: any[] = []
      for (let d = 0; d < 7; d++) {
        const key = parseDateOnlyStr(cursor)
        const v = byDay.get(key) || null
        const future = cursor > today
        week.push({ date: key, v, future })
        if (d === 0) {
          const m = cursor.getMonth()
          if (m !== lastMonth) {
            monthLabels.push({ label: monthName(m, true), col })
            lastMonth = m
          }
        }
        cursor = addDays(cursor, 1)
      }
      weeks.push(week)
      col++
      if (cursor > today) break
    }
    return { weeks, monthLabels }
  }, [data, weekStartsOn])

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-muted" />
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-1 flex pl-7 text-[10px] text-text-muted">
          {monthLabels.map((m, i) => (
            <span key={i} style={{ position: 'absolute', left: 28 + m.col * 14 }} className="relative">
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col justify-around pr-1 text-[9px] text-text-muted">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => {
                  const level = levelFor(day.v)
                  return (
                    <Tooltip key={day.date}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => !day.future && openDayDrawer(day.date)}
                          className={cn(
                            'h-3 w-3 rounded-[3px] transition hover:ring-1 hover:ring-primary',
                            day.future && 'opacity-30',
                          )}
                          style={{ backgroundColor: `var(--heatmap-${level})` }}
                          aria-label={`${day.date}: ${day.v ? day.v.completed + ' done' : 'no activity'}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="space-y-0.5">
                          <div className="font-medium">{day.v ? formatTipDate(day.date) : formatTipDate(day.date)}</div>
                          {day.v ? (
                            <>
                              <div className="text-success">✓ {day.v.completed} done</div>
                              {day.v.skipped > 0 && <div className="text-skipped">− {day.v.skipped} skipped</div>}
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
        </div>
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-text-muted">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: `var(--heatmap-${l})` }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

function levelFor(v: { completed: number; skipped: number; pending: number } | null): number {
  if (!v || v.completed === 0) return 0
  if (v.completed >= 6) return 4
  if (v.completed >= 4) return 3
  if (v.completed >= 2) return 2
  return 1
}

function formatTipDate(s: string): string {
  return parseDateOnly(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
