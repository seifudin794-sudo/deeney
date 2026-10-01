'use client'

import { Calendar } from 'lucide-react'
import { useDayTasks, useToggleComplete } from '@/hooks/use-data'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useUI } from '@/store/ui'
import { CategoryPill, PriorityMarker, StatusBadge, SubtaskProgress } from '@/components/common/task-bits'
import { monthName, parseDateOnly } from '@/lib/date'
import { LoadingCard } from '@/components/common/states'
import { Checkbox } from '@/components/ui/checkbox'

export function DayDetailDrawer() {
  const { dayDrawerDate, closeDayDrawer } = useUI()
  const { data, isLoading } = useDayTasks(dayDrawerDate)
  const toggle = useToggleComplete()

  const date = dayDrawerDate ? parseDateOnly(dayDrawerDate) : null

  return (
    <Sheet open={!!dayDrawerDate} onOpenChange={(o) => !o && closeDayDrawer()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {date ? `${monthName(date.getMonth())} ${date.getDate()}, ${date.getFullYear()}` : ''}
          </SheetTitle>
          <SheetDescription>
            {data?.tasks.length ? `${data.tasks.length} task${data.tasks.length === 1 ? '' : 's'} this day` : 'A quiet day.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2.5">
          {isLoading && <LoadingCard />}
          {!isLoading && data?.tasks.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
              No tasks planned for this day.
            </p>
          )}
          {data?.tasks.map((t) => {
            const done = t.subtasks.filter((s) => s.isDone).length
            return (
              <div key={t.id} className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={t.status === 'completed'}
                    onCheckedChange={(v) => {
                      toggle.mutate({ id: t.id, completed: !!v })
                    }}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${t.status === 'completed' ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                        {t.title}
                      </p>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                      <CategoryPill category={t.category} />
                      <PriorityMarker priority={t.priority} />
                      {t.subtasks.length > 0 && <SubtaskProgress done={done} total={t.subtasks.length} />}
                    </div>
                    {t.skipReason && (
                      <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs italic text-text-secondary">
                        “{t.skipReason}”
                      </p>
                    )}
                    {t.subtasks.length > 0 && (
                      <ul className="mt-2.5 space-y-1">
                        {t.subtasks.map((s) => (
                          <li key={s.id} className="flex items-center gap-2 text-xs">
                            <span className={`h-1.5 w-1.5 rounded-full ${s.isDone ? 'bg-success' : 'bg-text-muted'}`} />
                            <span className={s.isDone ? 'text-text-muted line-through' : 'text-text-secondary'}>{s.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
