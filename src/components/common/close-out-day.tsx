'use client'

import { useState, useMemo, useEffect } from 'react'
import { AlertTriangle, Check, SkipForward, CalendarClock, Loader2, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTasks, useSkipTask, useToggleComplete, useCategories } from '@/hooks/use-data'
import { CategoryPill } from '@/components/common/task-bits'
import { todayDateOnly, parseDateOnly, toDateOnly } from '@/lib/date'
import { SKIP_REASON_CHIPS } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/types'

// Modal shown when there are overdue (pending, due_date < today) tasks.
// Every overdue task must be resolved (done backdated, or skipped with reason)
// before the user can dismiss it.
export function CloseOutDayModal() {
  const [dismissed, setDismissed] = useState(false)
  const [rescheduleMap, setRescheduleMap] = useState<Record<string, string | undefined>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [openPerTask, setOpenPerTask] = useState<Record<string, boolean>>({})

  const { data: categories } = useCategories()
  const { data, isLoading } = useTasks({ to: toDateOnly(addDays(new Date(), -1)), status: 'pending' })
  const skip = useSkipTask()
  const complete = useToggleComplete()

  const overdue = useMemo(
    () => (data || []).filter((t) => t.dueDate < todayDateOnly()).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [data],
  )

  const open = !dismissed && overdue.length > 0

  // reset dismissal if new overdue appear later
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (overdue.length === 0) setDismissed(false)
  }, [overdue.length])

  if (!open) return null

  function setReason(id: string, v: string) {
    setReasons((r) => ({ ...r, [id]: v }))
  }

  async function markDone(t: Task) {
    try {
      await complete.mutateAsync({ id: t.id, completed: true })
      toast.success(`Marked “${t.title}” as done`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function markSkipped(t: Task) {
    const reason = (reasons[t.id] || '').trim()
    if (reason.length < 5) {
      toast.error('Please write a reason of at least 5 characters')
      return
    }
    try {
      await skip.mutateAsync({ id: t.id, reason, rescheduleTo: rescheduleMap[t.id] })
      setReasons((r) => ({ ...r, [t.id]: '' }))
      toast.success(rescheduleMap[t.id] ? 'Skipped & rescheduled' : 'Skipped with reason')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <AlertTriangle className="h-5 w-5" /> Close out the day
          </DialogTitle>
          <DialogDescription>
            You have <span className="font-semibold text-text-primary">{overdue.length}</span> overdue task
            {overdue.length === 1 ? '' : 's'} that need closure. Mark each done (backdated) or skip it with a reason
            before continuing.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {overdue.map((t) => {
            const reason = reasons[t.id] || ''
            const canSkip = reason.trim().length >= 5
            return (
              <div key={t.id} className="rounded-xl border border-border bg-surface p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <CategoryPill category={t.category} />
                      <span className="text-[11px] text-danger">Was due {formatRel(t.dueDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => markDone(t)} disabled={complete.isPending} className="gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Done
                  </Button>
                  <Popover open={openPerTask[t.id]} onOpenChange={(o) => setOpenPerTask((m) => ({ ...m, [t.id]: o }))}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5" /> {rescheduleMap[t.id] ? formatShort(rescheduleMap[t.id]!) : 'Reschedule'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={rescheduleMap[t.id] ? parseDateOnly(rescheduleMap[t.id]!) : undefined}
                        onSelect={(d) => {
                          if (d) {
                            setRescheduleMap((m) => ({ ...m, [t.id]: toDateOnly(d) }))
                            setOpenPerTask((m) => ({ ...m, [t.id]: false }))
                          }
                        }}
                        disabled={(d) => d < new Date()}
                        weekStartsOn={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="mt-3">
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                    <Lock className="h-3 w-3" /> Why did you skip it? <span className="text-danger">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(t.id, e.target.value)}
                    placeholder="e.g. Ran out of time after the meeting ran long…"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SKIP_REASON_CHIPS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setReason(t.id, c)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                          reason === c
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-muted hover:text-text-primary',
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2.5 gap-1.5"
                    onClick={() => markSkipped(t)}
                    disabled={!canSkip || skip.isPending}
                  >
                    {skip.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
                    Skip {rescheduleMap[t.id] ? '& reschedule' : ''}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Resolve all {overdue.length} to continue
          </span>
          <span className="tnum">{overdue.filter((t) => false).length} left</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function formatRel(date: string): string {
  const d = parseDateOnly(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff} days ago`
}

function formatShort(date: string): string {
  const d = parseDateOnly(date)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
