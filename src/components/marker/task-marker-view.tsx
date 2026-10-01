'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Check, X, Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { useTasks, useStats, useSetMark } from '@/hooks/use-data'
import { CategoryPill, PriorityPill, RepeatPill, StatusBadge } from '@/components/common/bits'
import { EmptyState, LoadingCard } from '@/components/common/states'
import { useUI } from '@/store/ui'
import { addDays, formatDateLong, formatDateMed, parseDateOnly, todayDateOnly, occursOn } from '@/lib/date'
import type { Task, TaskMark } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// We compute occurrences client-side for the selected date (fast, no fetch),
// then read each task's mark from the stats endpoint (which also runs the
// auto not-done rule server-side for the range).

export function TaskMarkerView() {
  const { setView } = useUI()
  const [selectedDate, setSelectedDate] = useState<string>(todayDateOnly())
  const [calOpen, setCalOpen] = useState(false)

  const { data: tasks, isLoading: tasksLoading } = useTasks()
  // pull a 1-day range so marks are ensured + auto-closed for this date
  const { data: stats, isLoading: marksLoading, refetch } = useStats({ from: selectedDate, to: selectedDate })

  const markMap = useMemo(() => {
    const m = new Map<string, TaskMark>()
    for (const row of stats?.marks || []) {
      if (row.dueDate === selectedDate) {
        m.set(row.taskId, {
          id: (row as any).id || 'pending',
          taskId: row.taskId,
          dueDate: row.dueDate,
          status: row.status as TaskMark['status'],
          reason: row.reason,
          autoMarked: row.auto,
          markedAt: null,
        })
      }
    }
    return m
  }, [stats, selectedDate])

  const dueTasks = useMemo(() => {
    const date = parseDateOnly(selectedDate)
    return (tasks || [])
      .filter((t) => occursOn(t, date))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [tasks, selectedDate])

  // open the first unmarked task by default; re-evaluate when marks load
  const [openId, setOpenId] = useState<string | null>(null)
  const pendingTaskId = dueTasks.find((t) => {
    const m = markMap.get(t.id)
    return !m || m.status === 'pending'
  })?.id
  useEffect(() => {
    setOpenId(pendingTaskId ?? dueTasks[0]?.id ?? null)
  }, [pendingTaskId, dueTasks.length])

  const allMarked = dueTasks.length > 0 && dueTasks.every((t) => {
    const m = markMap.get(t.id)
    return m && m.status !== 'pending'
  })

  return (
    <div className="space-y-5">
      {/* date picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl">Task Marker</h1>
          <p className="mt-1 text-sm text-text-muted">Mark each task done — or be honest about why not.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => shiftDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 px-3">
                <CalendarClock />
                <span className="tnum text-sm font-medium">{formatDateMed(selectedDate)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={parseDateOnly(selectedDate)}
                onSelect={(d) => {
                  if (d) {
                    setSelectedDate(dateOnly(d))
                    setCalOpen(false)
                  }
                }}
                weekStartsOn={1}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => shiftDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-text-muted">{formatDateLong(selectedDate)}</p>

      {tasksLoading || marksLoading ? (
        <div className="space-y-2.5">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : dueTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No tasks scheduled for this day"
          description="Tasks appear here based on their repeat rule and start date. Add one in the Task Adder."
          action={<Button onClick={() => setView('adder')} className="gap-1.5"><ChevronRight className="h-4 w-4" /> Go to Task Adder</Button>}
        />
      ) : allMarked ? (
        <div className="rounded-2xl border border-success/30 bg-success/5 px-6 py-10 text-center">
          <CheckCircle2 className="mx-auto h-9 w-9 text-success" />
          <h3 className="mt-3 text-base font-semibold text-text">All tasks marked for today</h3>
          <p className="mt-1 text-sm text-text-muted">Nice work. Pick another day above, or add a new task.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {dueTasks.map((t) => {
            const mark = markMap.get(t.id)
            const status = mark?.status || 'pending'
            const open = openId === t.id
            return (
              <MarkerCard
                key={t.id}
                task={t}
                mark={mark}
                status={status}
                open={open}
                dueDate={selectedDate}
                onToggle={() => setOpenId(open ? null : t.id)}
                onMarked={() => {
                  refetch()
                  // advance to next unmarked
                  setTimeout(() => {
                    const next = dueTasks.find((tt) => {
                      if (tt.id === t.id) return false
                      const m = markMap.get(tt.id)
                      return !m || m.status === 'pending'
                    })
                    // After refetch the mark map updates; but to be safe also consider this task now done.
                    setOpenId(next?.id ?? null)
                  }, 50)
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )

  function shiftDay(n: number) {
    setSelectedDate(dateOnly(addDays(parseDateOnly(selectedDate), n)))
  }
}

function CalendarClock() {
  return <Clock className="h-4 w-4 text-text-muted" />
}

function dateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function MarkerCard({
  task,
  mark,
  status,
  open,
  dueDate,
  onToggle,
  onMarked,
}: {
  task: Task
  mark?: TaskMark
  status: 'pending' | 'done' | 'not_done'
  open: boolean
  dueDate: string
  onToggle: () => void
  onMarked: () => void
}) {
  const setMark = useSetMark()
  const [showReason, setShowReason] = useState(false)
  const [reason, setReason] = useState(mark?.reason || '')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReason(mark?.reason || '')
    setShowReason(false)
  }, [mark?.reason, task.id, dueDate])

  const accent =
    status === 'done' ? 'border-success/40' : status === 'not_done' ? 'border-danger/40' : 'border-border'

  async function markDone() {
    try {
      await setMark.mutateAsync({ taskId: task.id, dueDate, status: 'done' })
      toast.success('Marked done')
      onMarked()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function markNotDone() {
    if (!showReason) {
      setShowReason(true)
      return
    }
    if (reason.trim().length < 2) {
      toast.error('Please write a reason (at least 2 characters)')
      return
    }
    try {
      await setMark.mutateAsync({ taskId: task.id, dueDate, status: 'not_done', reason: reason.trim() })
      toast.success('Marked not done')
      onMarked()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-card transition', accent, open && 'shadow-sm')}>
      {/* header row */}
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <CategoryPill category={task.category} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{task.name}</span>
        {mark?.autoMarked && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">Auto</span>
        )}
        <StatusBadge status={status} />
        <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <PriorityPill priority={task.priority} />
            <RepeatPill repeatType={task.repeatType} />
            {task.subtasks.length > 0 && (
              <span className="text-[11px] text-text-muted">{task.subtasks.length} subtask{task.subtasks.length === 1 ? '' : 's'}</span>
            )}
          </div>

          {task.subtasks.length > 0 && (
            <ul className="mb-3 space-y-1.5 rounded-xl bg-muted/50 p-3">
              {task.subtasks.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 text-sm">
                  <Checkbox checked disabled className="opacity-60" />
                  <span className="text-text-soft">{s.title}</span>
                </li>
              ))}
            </ul>
          )}

          {mark?.autoMarked && (
            <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-text-muted">
              <AlertCircle className="h-3.5 w-3.5" />
              Auto-marked: not done within 48 hours. You can still change this.
            </p>
          )}

          {/* reason box (shown after pressing NO) */}
          {showReason ? (
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-text-soft">Why wasn't this done? <span className="text-danger">*</span></label>
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Be honest with yourself…"
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-primary"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowReason(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={markNotDone} disabled={setMark.isPending} className="gap-1.5">
                  {setMark.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Save reason
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={markDone}
                disabled={setMark.isPending}
                className="h-12 gap-2 bg-success text-success-foreground hover:bg-success/90"
              >
                <Check className="h-5 w-5" />
                YES — Done
              </Button>
              <Button
                onClick={markNotDone}
                disabled={setMark.isPending}
                variant="destructive"
                className="h-12 gap-2"
              >
                <X className="h-5 w-5" />
                NO — Not done
              </Button>
            </div>
          )}

          {mark?.reason && !showReason && (
            <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs italic text-text-soft">“{mark.reason}”</p>
          )}
        </div>
      )}
    </div>
  )
}
