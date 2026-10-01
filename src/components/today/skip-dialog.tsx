'use client'

import { useState, useEffect } from 'react'
import { SkipForward, CalendarClock, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSkipTask } from '@/hooks/use-data'
import { SKIP_REASON_CHIPS } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { parseDateOnly, toDateOnly } from '@/lib/date'

export function SkipDialog({
  taskId,
  title,
  open,
  onOpenChange,
  allowReschedule = true,
}: {
  taskId: string | null
  title: string
  open: boolean
  onOpenChange: (v: boolean) => void
  allowReschedule?: boolean
}) {
  const [reason, setReason] = useState('')
  const [rescheduleTo, setRescheduleTo] = useState<string | undefined>()
  const [calOpen, setCalOpen] = useState(false)
  const skip = useSkipTask()

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReason('')
      setRescheduleTo(undefined)
    }
  }, [open, taskId])

  const canSkip = reason.trim().length >= 5

  async function submit() {
    if (!taskId) return
    if (!canSkip) {
      toast.error('Please write a reason of at least 5 characters')
      return
    }
    try {
      await skip.mutateAsync({ id: taskId, reason: reason.trim(), rescheduleTo })
      toast.success(rescheduleTo ? 'Skipped & rescheduled' : 'Skipped with reason')
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SkipForward className="h-4 w-4 text-skipped" /> Skip this task
          </DialogTitle>
          <DialogDescription className="truncate">“{title}”</DialogDescription>
        </DialogHeader>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Why are you skipping it? <span className="text-danger">*</span>
          </label>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Be honest with yourself — this stays private…"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SKIP_REASON_CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => setReason(c)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                  reason === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:text-text-primary',
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {reason.length > 0 && reason.trim().length < 5 && (
            <p className="mt-1.5 text-[11px] text-danger">At least 5 characters required.</p>
          )}
        </div>

        {allowReschedule && (
          <div>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {rescheduleTo ? `Reschedule to ${formatShort(rescheduleTo)}` : 'Reschedule to a new date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={rescheduleTo ? parseDateOnly(rescheduleTo) : undefined}
                  onSelect={(d) => {
                    if (d) {
                      setRescheduleTo(toDateOnly(d))
                      setCalOpen(false)
                    }
                  }}
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
            {rescheduleTo && (
              <button onClick={() => setRescheduleTo(undefined)} className="ml-2 text-[11px] text-text-muted underline">
                clear
              </button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSkip || skip.isPending} className="gap-1.5">
            {skip.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
            Skip task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatShort(date: string): string {
  return parseDateOnly(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
