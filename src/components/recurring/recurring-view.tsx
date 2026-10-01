'use client'

import { useState } from 'react'
import { Plus, Repeat2, Pencil, Pause, Play, Trash2, Flame, CheckCircle2, Loader2 } from 'lucide-react'
import { useRecurring, useSaveRecurring, useDeleteRecurring, useTasks, useCategories } from '@/hooks/use-data'
import { PageHeader, LoadingCard, EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { CategoryPill, PriorityMarker } from '@/components/common/task-bits'
import { occurrencesFor, parseDateOnly, parseDateOnlyStr, addDays, todayDateOnly } from '@/lib/date'
import type { Priority, RecurrenceRule, RecurringTemplate } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function RecurringView() {
  const { data, isLoading, error, refetch } = useRecurring()
  const { data: tasks } = useTasks({ recurring: 'true' })
  const del = useDeleteRecurring()

  return (
    <div className="space-y-5">
      <PageHeader title="Recurring tasks" subtitle="Routines that repeat. Pause, edit, or end any time.">
        <RecurringFormDialog trigger={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> New recurring</Button>} />
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <LoadingCard key={i} />)}</div>
      ) : error ? (
        <ErrorState message="Couldn't load recurring tasks." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Repeat2} title="No recurring tasks yet" description="Set up a routine — daily writing, weekly review, monthly planning — and it'll generate itself."
          action={<RecurringFormDialog trigger={<Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Create one</Button>} />} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((t) => {
            const stats = computeStats(t, tasks || [])
            return (
              <div key={t.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{t.title}</p>
                    {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">{t.description}</p>}
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', t.isActive ? 'bg-success/10 text-success' : 'bg-muted text-text-muted')}>
                    {t.isActive ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-lg bg-muted px-2 py-1 font-medium text-text-secondary">{labelForRule(t.rule, t.weekdays)}</span>
                  <CategoryPill category={t.category} />
                  <PriorityMarker priority={t.priority} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Next" value={stats.next ? shortDate(stats.next) : '—'} />
                  <Stat label="Rate" value={`${stats.rate}%`} />
                  <Stat label="Streak" value={`${stats.streak}d`} />
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  <RecurringFormDialog template={t} trigger={<Button variant="outline" size="sm" className="gap-1.5"><Pencil className="h-3 w-3" /> Edit</Button>} />
                  <PauseButton template={t} />
                  <Button variant="ghost" size="sm" className="gap-1.5 text-danger hover:text-danger" onClick={() => del.mutate(t.id, { onSuccess: () => toast.success('Deleted') })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PauseButton({ template }: { template: RecurringTemplate }) {
  const save = useSaveRecurring()
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => save.mutate({ id: template.id, data: { isActive: !template.isActive } }, { onSuccess: () => toast.success(template.isActive ? 'Paused' : 'Resumed') })}
    >
      {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : template.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      {template.isActive ? 'Pause' : 'Resume'}
    </Button>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <p className="tnum text-sm font-semibold text-text-primary">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  )
}

function RecurringFormDialog({ template, trigger }: { template?: RecurringTemplate; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { data: categories } = useCategories()
  const save = useSaveRecurring()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('none')
  const [priority, setPriority] = useState<Priority>('medium')
  const [rule, setRule] = useState<RecurrenceRule>('daily')
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startDate, setStartDate] = useState(todayDateOnly())
  const [endDate, setEndDate] = useState<string | undefined>()
  const [calOpen, setCalOpen] = useState<'start' | 'end' | null>(null)

  function sync() {
    if (template) {
      setTitle(template.title)
      setDescription(template.description || '')
      setCategoryId(template.categoryId || 'none')
      setPriority(template.priority)
      setRule(template.rule)
      setWeekdays(template.weekdays ? template.weekdays.split(',').map(Number) : [1, 2, 3, 4, 5])
      setStartDate(template.startDate)
      setEndDate(template.endDate || undefined)
    } else {
      setTitle('')
      setDescription('')
      setCategoryId('none')
      setPriority('medium')
      setRule('daily')
      setWeekdays([1, 2, 3, 4, 5])
      setStartDate(todayDateOnly())
      setEndDate(undefined)
    }
  }

  async function submit() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    try {
      await save.mutateAsync({
        id: template?.id,
        data: {
          title,
          description: description || null,
          categoryId: categoryId === 'none' ? null : categoryId,
          priority,
          rule,
          weekdays: rule === 'weekdays' ? weekdays.join(',') : null,
          startDate,
          endDate: endDate || null,
          isActive: template?.isActive ?? true,
        },
      })
      toast.success(template ? 'Updated' : 'Recurring task created')
      setOpen(false)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <div onClick={() => { sync(); setOpen(true) }}>{trigger}</div>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) sync() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Repeat2 className="h-4 w-4 text-primary" /> {template ? 'Edit recurring task' : 'New recurring task'}</DialogTitle>
            <DialogDescription>This becomes a template. Occurrences generate for the next 14 days.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Morning writing block" className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium text-text-primary outline-none focus:border-primary" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(categories || []).map((c) => <SelectItem key={c.id} value={c.id}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span></SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={rule} onValueChange={(v) => setRule(v as RecurrenceRule)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Specific weekdays</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {rule === 'weekdays' && (
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((w, i) => {
                  const active = weekdays.includes(i)
                  return (
                    <button key={i} onClick={() => setWeekdays((a) => active ? a.filter((x) => x !== i) : [...a, i].sort())}
                      className={cn('flex h-8 w-12 items-center justify-center rounded-lg border text-[11px] font-medium', active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:text-text-primary')}>{w}</button>
                  )
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={calOpen === 'start'} onOpenChange={(o) => setCalOpen(o ? 'start' : null)}>
                <PopoverTrigger asChild><Button variant="outline" size="sm">Start: {shortDate(startDate)}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={parseDateOnly(startDate)} onSelect={(d) => d && setStartDate(parseDateOnlyStr(d))} weekStartsOn={1} /></PopoverContent>
              </Popover>
              <Popover open={calOpen === 'end'} onOpenChange={(o) => setCalOpen(o ? 'end' : null)}>
                <PopoverTrigger asChild><Button variant="outline" size="sm">End: {endDate ? shortDate(endDate) : 'Never'}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate ? parseDateOnly(endDate) : undefined} onSelect={(d) => d && setEndDate(parseDateOnlyStr(d))} weekStartsOn={1} /></PopoverContent>
              </Popover>
              {endDate && <button onClick={() => setEndDate(undefined)} className="text-[11px] text-text-muted underline">never</button>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!title.trim() || save.isPending} className="gap-1.5">
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {template ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function computeStats(t: RecurringTemplate, tasks: any[]) {
  const mine = tasks.filter((x) => x.parentRecurringId === t.id)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const from = new Date(today)
  const to = addDays(today, 30)
  const occ = occurrencesFor({ rule: t.rule, weekdays: t.weekdays, startDate: t.startDate, endDate: t.endDate }, from, to)
  const next = occ[0] ? parseDateOnlyStr(occ[0]) : null
  const completed = mine.filter((x) => x.status === 'completed').length
  const total = mine.length
  const rate = total ? Math.round((completed / total) * 100) : 0
  // streak: consecutive completed from most recent
  let streak = 0
  const byDate = new Map(mine.map((x) => [x.dueDate, x]))
  const past = mine.filter((x) => x.dueDate <= parseDateOnlyStr(today)).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  for (const x of past) {
    if (x.status === 'completed') streak++
    else break
  }
  return { next, rate, streak }
}

function labelForRule(rule: RecurrenceRule, weekdays: string | null): string {
  if (rule === 'weekdays' && weekdays) {
    const days = weekdays.split(',').map(Number).map((d) => WEEKDAYS[d]).join(' · ')
    return days
  }
  return rule.charAt(0).toUpperCase() + rule.slice(1)
}

function shortDate(s: string): string {
  return parseDateOnly(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
