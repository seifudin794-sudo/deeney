'use client'

import { useState, useMemo, useEffect } from 'react'
import { CheckCircle2, Clock, XCircle, X, Loader2, CalendarDays, LineChart as LineChartIcon, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useStats, useTasks } from '@/hooks/use-data'
import { EmptyState, LoadingCard, ErrorState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/bits'
import { useUI } from '@/store/ui'
import {
  todayDateOnly,
  parseDateOnly,
  toDateOnly,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  formatDateShort,
  formatDateMed,
  occursOn,
} from '@/lib/date'
import { cn } from '@/lib/utils'
import type { Priority, RepeatType } from '@/lib/types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type RangeKey = 'today' | 'week' | 'month' | 'custom'

const RANGE_LABEL: Record<RangeKey, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  custom: 'Custom',
}

export function DashboardView() {
  const { setView } = useUI()
  const [range, setRange] = useState<RangeKey>('today')
  const [customFrom, setCustomFrom] = useState<string | undefined>()
  const [customTo, setCustomTo] = useState<string | undefined>()
  const [calOpen, setCalOpen] = useState(false)

  const { from, to } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    switch (range) {
      case 'today':
        return { from: todayDateOnly(), to: todayDateOnly() }
      case 'week':
        return { from: toDateOnly(startOfWeek(today)), to: toDateOnly(endOfWeek(today)) }
      case 'month':
        return { from: toDateOnly(startOfMonth(today)), to: toDateOnly(endOfMonth(today)) }
      case 'custom':
        return { from: customFrom || todayDateOnly(), to: customTo || todayDateOnly() }
    }
  }, [range, customFrom, customTo])

  const { data, isLoading, error, refetch } = useStats({ from, to })
  const { data: tasks } = useTasks()
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null)

  const hasTasks = (tasks?.length || 0) > 0

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text sm:text-2xl tnum">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h1>
          <p className="mt-1 text-sm text-text-muted">Your progress at a glance.</p>
        </div>

        {/* range switch */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border bg-card p-1">
            {(['today', 'week', 'month', 'custom'] as RangeKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  range === k ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text',
                )}
              >
                {RANGE_LABEL[k]}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {customFrom && customTo ? `${formatDateShort(customFrom)}–${formatDateShort(customTo)}` : 'Pick dates'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: customFrom ? parseDateOnly(customFrom) : undefined, to: customTo ? parseDateOnly(customTo) : undefined }}
                  onSelect={(r) => {
                    if (r?.from) setCustomFrom(toDateOnly(r.from))
                    if (r?.to) setCustomTo(toDateOnly(r.to))
                    if (r?.from && r?.to) setCalOpen(false)
                  }}
                  numberOfMonths={2}
                  weekStartsOn={1}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {!hasTasks ? (
        <EmptyState
          icon={CalendarDays}
          title="No tasks yet"
          description="Add your first task and start building a streak."
          action={<Button onClick={() => setView('adder')} className="gap-1.5">Add a task</Button>}
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <LoadingCard key={i} />)}
          </div>
        </div>
      ) : error ? (
        <ErrorState message="Couldn't load your dashboard." />
      ) : data ? (
        <>
          {/* summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={CheckCircle2}
              label="Completed"
              value={data.summary.done}
              suffix={data.summary.total ? `${Math.round((data.summary.done / data.summary.total) * 100)}%` : '0%'}
              tone="success"
            />
            <SummaryCard
              icon={Clock}
              label="Pending"
              value={data.summary.pending}
              tone="warning"
            />
            <SummaryCard
              icon={XCircle}
              label="Not done"
              value={data.summary.notDone}
              tone="danger"
            />
            <ProgressRing rate={data.summary.overallRate} />
          </div>

          {/* task progress cards */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Task progress</h2>
            {data.taskProgress.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                No tasks fall in this range.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.taskProgress.map((tp: any) => (
                  <TaskProgressCard
                    key={tp.taskId}
                    tp={tp}
                    onClick={() => setHistoryTaskId(tp.taskId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* recent not-done reasons */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Recent "Not done" reasons</h2>
            {data.recentNotDone.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
                Nothing skipped recently — nicely done.
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentNotDone.map((r: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="w-16 shrink-0">
                      <p className="tnum text-xs font-semibold text-text">{formatDateShort(r.date)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{r.taskName}</p>
                      <p className="mt-0.5 text-xs italic text-text-soft">“{r.reason}”</p>
                    </div>
                    {r.auto && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">Auto</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* progress graph — independent date + task filters */}
      <ProgressGraph />

      {/* history side panel */}
      <HistorySheet taskId={historyTaskId} onOpenChange={(o) => !o && setHistoryTaskId(null)} />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: any
  label: string
  value: number
  suffix?: string
  tone: 'success' | 'warning' | 'danger'
}) {
  const colors = {
    success: { bg: 'var(--success)', fg: 'var(--success-foreground)' },
    warning: { bg: 'var(--warning)', fg: 'var(--warning-foreground)' },
    danger: { bg: 'var(--danger)', fg: 'var(--danger-foreground)' },
  } as const
  const c = colors[tone]
  return (
    <div className="rounded-2xl border border-border p-5" style={{ backgroundColor: `color-mix(in srgb, ${c.bg} 12%, var(--card))` }}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: c.bg, color: c.fg }}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="tnum text-3xl font-semibold text-text">{value}</span>
        {suffix && <span className="tnum text-sm font-medium text-text-muted">{suffix}</span>}
      </div>
    </div>
  )
}

function ProgressRing({ rate }: { rate: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (rate / 100) * circ
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="relative h-20 w-20 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
          <circle
            cx="40" cy="40" r={r} fill="none"
            stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 400ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="tnum text-lg font-semibold text-text">{rate}%</span>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Overall progress</p>
        <p className="mt-0.5 text-sm text-text-soft">% completed in range</p>
      </div>
    </div>
  )
}

function TaskProgressCard({ tp, onClick }: { tp: any; onClick: () => void }) {
  const todayTone =
    tp.todayStatus === 'done' ? 'border-success/40 bg-success/[0.03]' :
    tp.todayStatus === 'not_done' ? 'border-danger/40 bg-danger/[0.03]' :
    'border-warning/40 bg-warning/[0.03]'

  return (
    <button
      onClick={onClick}
      className={cn('rounded-2xl border bg-card p-4 text-left transition hover:shadow-sm', todayTone)}
    >
      <div className="flex items-center gap-2">
        {tp.categoryColor && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tp.categoryColor }} />}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{tp.taskName}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
        <PriorityChip priority={tp.priority} />
        <RepeatChip repeatType={tp.repeatType} />
      </div>

      {/* progress bar */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-text-muted">{tp.hasSubtasks ? 'Subtasks done' : 'Completed'}</span>
          <span className="tnum font-medium text-text">
            {tp.hasSubtasks
              ? `${tp.days.reduce((acc: number, d: any) => acc + Object.values(d.subtasks || {}).filter((v: string) => v === 'done').length, 0)}/${tp.subtaskCount * tp.totalDays} · ${tp.completionRate}%`
              : `${tp.doneCount}/${tp.totalDays} · ${tp.completionRate}%`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${tp.completionRate}%` }} />
        </div>
      </div>

      {/* day dots */}
      <div className="mt-3 flex flex-wrap gap-1">
        {tp.days.map((d: any, i: number) => (
          <span
            key={i}
            title={`${formatDateMed(d.date)} — ${d.status}`}
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              d.status === 'done' && 'bg-success',
              d.status === 'not_done' && 'bg-danger',
              d.status === 'pending' && 'bg-warning',
            )}
          />
        ))}
      </div>
    </button>
  )
}

function PriorityChip({ priority }: { priority: Priority }) {
  const colors = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--text-muted)' }
  const labels = { high: 'High', medium: 'Med', low: 'Low' }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: `color-mix(in srgb, ${colors[priority]} 14%, transparent)`, color: colors[priority] }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors[priority] }} />
      {labels[priority]}
    </span>
  )
}
function RepeatChip({ repeatType }: { repeatType: RepeatType }) {
  const labels = { daily: 'Daily', every_3_days: 'Every 3d', weekly: 'Weekly' }
  return <span className="rounded-full bg-muted px-2 py-0.5">{labels[repeatType]}</span>
}

function HistorySheet({ taskId, onOpenChange }: { taskId: string | null; onOpenChange: (o: boolean) => void }) {
  // fetch the task's history via the stats endpoint (already includes marks for all tasks in the last 90 days when range is wide)
  const { data: stats } = useStats({ from: toDateOnly(addDays(new Date(), -89)), to: todayDateOnly() })
  const history = useMemo(() => {
    if (!stats || !taskId) return []
    return (stats.marks || []).filter((m: any) => m.taskId === taskId && m.status !== 'pending').sort((a: any, b: any) => b.dueDate.localeCompare(a.dueDate))
  }, [stats, taskId])
  const allHistory = useMemo(() => {
    if (!stats || !taskId) return []
    return (stats.marks || []).filter((m: any) => m.taskId === taskId).sort((a: any, b: any) => b.dueDate.localeCompare(a.dueDate))
  }, [stats, taskId])

  const task = stats?.taskProgress?.find((t: any) => t.taskId === taskId)

  return (
    <Sheet open={!!taskId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="truncate">{task?.taskName || 'Task history'}</SheetTitle>
          <SheetDescription>
            {task ? `${task.doneCount} done · ${task.notDoneCount} not done · ${task.pendingCount} pending` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {allHistory.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
              No history yet.
            </p>
          )}
          {allHistory.map((d: any) => (
            <div key={d.dueDate} className="flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5">
              <div className="w-16 shrink-0">
                <p className="tnum text-xs font-semibold text-text">{formatDateShort(d.dueDate)}</p>
                <p className="text-[10px] text-text-muted">{parseDateOnly(d.dueDate).toLocaleDateString('en-GB', { weekday: 'short' })}</p>
              </div>
              <div className="min-w-0 flex-1">
                <StatusBadge status={d.status} />
                {d.reason && <p className="mt-1.5 text-xs italic text-text-soft">“{d.reason}”</p>}
                {d.auto && (
                  <span className="mt-1.5 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">Auto</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Progress Graph ──────────────────────────────────────────────
// Independent section with its own date range + task multi-select.
// Shows a line chart of daily completion % for each selected MAIN task
// (subtasks are excluded — only top-level tasks appear in the picker).
const CHART_COLORS = [
  'var(--primary)', 'var(--success)', 'var(--warning)', 'var(--danger)',
  '#8b5cf6', '#0ea5e9', '#f97316', '#14b8a6',
]

function ProgressGraph() {
  const { data: tasks } = useTasks()
  const [graphFrom, setGraphFrom] = useState<string>(() => {
    const d = addDays(new Date(), -13)
    return toDateOnly(d)
  })
  const [graphTo, setGraphTo] = useState<string>(todayDateOnly())
  const [calOpen, setCalOpen] = useState(false)
  const [taskMenuOpen, setTaskMenuOpen] = useState(false)
  // selected task ids — default to all main tasks (auto-selected on first load)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Fetch stats for the graph's own date range.
  const { data, isLoading } = useStats({ from: graphFrom, to: graphTo })

  // Auto-select all main tasks on first load (once).
  const [didInit, setDidInit] = useState(false)
  useEffect(() => {
    if (!didInit && tasks && tasks.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIds(tasks.map((t) => t.id))
      setDidInit(true)
    }
  }, [didInit, tasks])

  const mainTasks = tasks || []

  // Build chart data: one row per date in range, one key per selected task.
  const chartData = useMemo(() => {
    if (!data) return []
    const rows: Record<string, any>[] = []
    const fromD = parseDateOnly(graphFrom)
    const toD = parseDateOnly(graphTo)
    const cursor = new Date(fromD)
    cursor.setHours(0, 0, 0, 0)
    while (cursor <= toD) {
      const dateStr = toDateOnly(cursor)
      const row: Record<string, any> = { date: dateStr }
      for (const tp of data.taskProgress) {
        if (!selectedIds.includes(tp.taskId)) continue
        const day = tp.days.find((d: any) => d.date === dateStr)
        if (!day) continue
        // For tasks with subtasks: completion = done subtasks / total subtasks.
        // For tasks without subtasks: 100 if done, 0 if not_done/pending.
        let pct: number
        if (tp.hasSubtasks) {
          const subs = Object.values(day.subtasks || {})
          const done = subs.filter((v: string) => v === 'done').length
          pct = subs.length ? Math.round((done / subs.length) * 100) : 0
        } else {
          pct = day.status === 'done' ? 100 : 0
        }
        row[tp.taskName] = pct
      }
      rows.push(row)
      cursor.setDate(cursor.getDate() + 1)
    }
    return rows
  }, [data, graphFrom, graphTo, selectedIds])

  const selectedNames = useMemo(() => {
    return mainTasks.filter((t) => selectedIds.includes(t.id)).map((t) => t.name)
  }, [mainTasks, selectedIds])

  function toggleTask(id: string) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function setQuickRange(days: number) {
    setGraphFrom(toDateOnly(addDays(new Date(), -(days - 1))))
    setGraphTo(todayDateOnly())
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold text-text">Progress over time</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* quick range chips */}
          <div className="flex rounded-lg border border-border p-0.5">
            {[
              { label: '7d', days: 7 },
              { label: '14d', days: 14 },
              { label: '30d', days: 30 },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => setQuickRange(q.days)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                  graphFrom === toDateOnly(addDays(new Date(), -(q.days - 1))) && graphTo === todayDateOnly()
                    ? 'bg-primary text-primary-foreground'
                    : 'text-text-muted hover:text-text',
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
          {/* date range picker */}
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="tnum">{formatDateShort(graphFrom)}–{formatDateShort(graphTo)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: parseDateOnly(graphFrom), to: parseDateOnly(graphTo) }}
                onSelect={(r) => {
                  if (r?.from) setGraphFrom(toDateOnly(r.from))
                  if (r?.to) {
                    setGraphTo(toDateOnly(r.to))
                    setCalOpen(false)
                  }
                }}
                numberOfMonths={2}
                weekStartsOn={1}
              />
            </PopoverContent>
          </Popover>
          {/* task multi-select */}
          <Popover open={taskMenuOpen} onOpenChange={setTaskMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                Tasks
                {selectedIds.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{selectedIds.length}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Filter tasks</span>
                <button
                  onClick={() => setSelectedIds(mainTasks.map((t) => t.id))}
                  className="text-[11px] text-primary hover:underline"
                >
                  All
                </button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {mainTasks.length === 0 && (
                  <p className="py-4 text-center text-xs text-text-muted">No tasks yet.</p>
                )}
                {mainTasks.map((t) => {
                  const active = selectedIds.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTask(t.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition',
                        active ? 'bg-primary/5 text-text' : 'text-text-muted hover:bg-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition',
                          active ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                        )}
                      >
                        {active && <span className="text-[10px]">✓</span>}
                      </span>
                      {t.category && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.category.color }} />}
                      <span className="truncate">{t.name}</span>
                      {t.subtasks.length > 0 && (
                        <span className="ml-auto text-[10px] text-text-muted">{t.subtasks.length} sub</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      ) : mainTasks.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border text-sm text-text-muted">
          No tasks to graph. Add a task first.
        </div>
      ) : selectedIds.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border text-sm text-text-muted">
          Select at least one task to see its progress.
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border text-sm text-text-muted">
          No occurrences in this range.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={(v) => {
                  const d = parseDateOnly(v)
                  return `${d.getDate()}/${d.getMonth() + 1}`
                }}
                interval="preserveStartEnd"
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
              <RTooltip content={<GraphTip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {selectedNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-[11px] text-text-muted">
            Each line shows the daily completion % of a task. 100% = fully done that day.
          </p>
        </>
      )}
    </div>
  )
}

function GraphTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d = parseDateOnly(label)
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-text">{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      <div className="space-y-0.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-text-soft">{p.dataKey}</span>
            <span className="ml-auto font-medium text-text tnum">{p.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
