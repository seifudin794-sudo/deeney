'use client'

import { useState, useMemo, useEffect, useRef, Fragment } from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Save,
  Trash2,
  X,
  LayoutList,
  CalendarRange,
} from 'lucide-react'
import { useTasks, useCategories, useToggleComplete, useDeleteTask } from '@/hooks/use-data'
import { PageHeader, LoadingCard, ErrorState, EmptyState } from '@/components/common/states'
import { CategoryPill, PriorityMarker, StatusBadge, SubtaskProgress } from '@/components/common/task-bits'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { exportUrl } from '@/lib/api'
import type { Task } from '@/lib/types'
import { parseDateOnly, toDateOnly, todayDateOnly } from '@/lib/date'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
]
const PRIORITIES = [
  { value: '', label: 'All priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]
const RECURRING = [
  { value: '', label: 'All tasks' },
  { value: 'true', label: 'Recurring only' },
  { value: 'false', label: 'One-off only' },
]

type Preset = { id: string; name: string; filter: FilterState }
type FilterState = {
  status: string
  categoryId: string
  priority: string
  recurring: string
  q: string
  from?: string
  to?: string
}

export function TasksView() {
  const [filter, setFilter] = useState<FilterState>({
    status: '',
    categoryId: '',
    priority: '',
    recurring: '',
    q: '',
  })
  const [groupByDay, setGroupByDay] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [presets, setPresets] = useState<Preset[]>([])
  const [presetName, setPresetName] = useState('')
  const [showSave, setShowSave] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: categories } = useCategories()
  const apiFilter = {
    status: filter.status || undefined,
    categoryId: filter.categoryId || undefined,
    priority: filter.priority || undefined,
    q: filter.q || undefined,
    recurring: (filter.recurring || undefined) as 'true' | 'false' | undefined,
    from: filter.from,
    to: filter.to,
  }
  const { data, isLoading, error, refetch } = useTasks(apiFilter)
  const toggle = useToggleComplete()
  const del = useDeleteTask()

  useEffect(() => {
    function focus() {
      searchRef.current?.focus()
    }
    window.addEventListener('app:focus-search', focus)
    return () => window.removeEventListener('app:focus-search', focus)
  }, [])

  // load presets
  useEffect(() => {
    try {
      const raw = localStorage.getItem('task-presets')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPresets(JSON.parse(raw))
    } catch {}
  }, [])

  const tasks = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => {
      if (groupByDay) {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        return a.sortOrder - b.sortOrder
      }
      return a.dueDate.localeCompare(b.dueDate) || a.sortOrder - b.sortOrder
    })
  }, [data, groupByDay])

  const groups = useMemo(() => {
    if (!groupByDay) return [{ key: 'all', date: '', items: tasks }]
    const m = new Map<string, Task[]>()
    for (const t of tasks) {
      if (!m.has(t.dueDate)) m.set(t.dueDate, [])
      m.get(t.dueDate)!.push(t)
    }
    return Array.from(m.entries()).map(([date, items]) => ({ key: date, date, items }))
  }, [tasks, groupByDay])

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function savePreset() {
    if (!presetName.trim()) return
    const p: Preset = { id: crypto.randomUUID(), name: presetName.trim(), filter: { ...filter } }
    const next = [...presets, p]
    setPresets(next)
    localStorage.setItem('task-presets', JSON.stringify(next))
    setPresetName('')
    setShowSave(false)
    toast.success('Preset saved')
  }
  function deletePreset(id: string) {
    const next = presets.filter((p) => p.id !== id)
    setPresets(next)
    localStorage.setItem('task-presets', JSON.stringify(next))
  }

  return (
    <div className="space-y-5">
      <PageHeader title="All tasks" subtitle="Every task, filterable and exportable.">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(exportUrl.csv(apiFilter), '_blank')}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(exportUrl.pdf({ range: 'custom', from: filter.from, to: filter.to }), '_blank')}>
          <Download className="h-3.5 w-3.5" /> PDF
        </Button>
      </PageHeader>

      {/* filter bar */}
      <div className="rounded-2xl border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              ref={searchRef}
              value={filter.q}
              onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search tasks… (/)"
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>

          <Select value={filter.status} onValueChange={(v) => setFilter((f) => ({ ...f, status: v === 'all' ? '' : v }))}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.slice(1).map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filter.priority} onValueChange={(v) => setFilter((f) => ({ ...f, priority: v === 'all' ? '' : v }))}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.slice(1).map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Category
                {filter.categoryId && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-1">
                <button onClick={() => setFilter((f) => ({ ...f, categoryId: '' }))} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted', !filter.categoryId && 'text-primary')}>All categories</button>
                {(categories || []).map((c) => (
                  <button key={c.id} onClick={() => setFilter((f) => ({ ...f, categoryId: c.id }))} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted', filter.categoryId === c.id && 'bg-primary/5 text-primary')}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Select value={filter.recurring} onValueChange={(v) => setFilter((f) => ({ ...f, recurring: v === 'all' ? '' : v }))}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              {RECURRING.slice(1).map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <DateRangeFilter filter={filter} setFilter={setFilter} />

          <button
            onClick={() => setGroupByDay((g) => !g)}
            className={cn('flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs transition', groupByDay ? 'bg-primary/10 text-primary' : 'text-text-muted hover:text-text-primary')}
          >
            <CalendarRange className="h-3.5 w-3.5" /> Group by day
          </button>
        </div>

        {/* presets row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] text-text-muted"><Save className="h-3 w-3" /> Presets:</span>
          {presets.length === 0 && <span className="text-[11px] text-text-muted italic">none yet — save your current filters</span>}
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-1 rounded-full border border-border bg-surface-elevated py-0.5 pl-2.5 pr-1 text-[11px]">
              <button onClick={() => setFilter(p.filter)} className="text-text-secondary hover:text-text-primary">{p.name}</button>
              <button onClick={() => deletePreset(p.id)} className="rounded-full p-0.5 text-text-muted hover:text-danger"><X className="h-3 w-3" /></button>
            </div>
          ))}
          {!showSave ? (
            <button onClick={() => setShowSave(true)} className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[11px] text-text-muted hover:text-text-primary">
              <Save className="h-3 w-3" /> Save current
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name" className="w-28 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] outline-none" />
              <button onClick={savePreset} className="rounded-md bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">Save</button>
              <button onClick={() => setShowSave(false)} className="text-text-muted"><X className="h-3 w-3" /></button>
            </div>
          )}
        </div>
      </div>

      {/* table */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <LoadingCard key={i} />)}</div>
      ) : error ? (
        <ErrorState message="Couldn't load tasks." onRetry={() => refetch()} />
      ) : tasks.length === 0 ? (
        <EmptyState icon={LayoutList} title="No tasks match" description="Try adjusting your filters — or clear them to see everything." />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.key}>
              {groupByDay && (
                <div className="sticky top-0 z-10 -mx-1 mb-2 flex items-center justify-between rounded-lg bg-background/80 px-3 py-1.5 backdrop-blur">
                  <span className="text-xs font-semibold text-text-primary">{fmtDayHeader(g.date)}</span>
                  <span className="tnum text-[11px] text-text-muted">{summarize(g.items)}</span>
                </div>
              )}
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="hidden bg-muted/40 sm:table-header-group">
                    <tr className="text-left text-[11px] uppercase tracking-wide text-text-muted">
                      <th className="w-8 px-3 py-2"></th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Task</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Priority</th>
                      <th className="px-3 py-2">Subtasks</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Skip reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((t) => {
                      const done = t.subtasks.filter((s) => s.isDone).length
                      const isOpen = expanded.has(t.id)
                      return (
                        <Fragment key={t.id}>
                          <tr className="border-t border-border align-top hover:bg-muted/30">
                            <td className="px-3 py-3">
                              <Checkbox checked={t.status === 'completed'} onCheckedChange={(v) => toggle.mutate({ id: t.id, completed: !!v })} />
                            </td>
                            <td className="hidden px-3 py-3 sm:table-cell">
                              <span className="tnum text-xs text-text-secondary">{fmtDayCell(t.dueDate)}</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                {t.subtasks.length > 0 && (
                                  <button onClick={() => toggleExpand(t.id)} className="text-text-muted hover:text-text-primary">
                                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  </button>
                                )}
                                <span className={cn('text-sm font-medium', t.status === 'completed' && 'text-text-muted line-through', t.status === 'skipped' && 'text-text-muted')}>
                                  {t.title}
                                </span>
                              </div>
                              <div className="mt-1 sm:hidden">
                                <span className="tnum text-[11px] text-text-muted">{fmtDayCell(t.dueDate)}</span>
                              </div>
                            </td>
                            <td className="hidden px-3 py-3 sm:table-cell"><CategoryPill category={t.category} /></td>
                            <td className="hidden px-3 py-3 sm:table-cell"><PriorityMarker priority={t.priority} /></td>
                            <td className="hidden px-3 py-3 sm:table-cell">{t.subtasks.length > 0 ? <SubtaskProgress done={done} total={t.subtasks.length} /> : <span className="text-xs text-text-muted">—</span>}</td>
                            <td className="px-3 py-3"><StatusBadge status={t.status} /></td>
                            <td className="hidden max-w-[220px] px-3 py-3 sm:table-cell">
                              {t.skipReason ? <span className="line-clamp-2 text-xs italic text-text-secondary">“{t.skipReason}”</span> : <span className="text-xs text-text-muted">—</span>}
                            </td>
                            <td className="px-2 py-3">
                              <button onClick={() => del.mutate(t.id, { onSuccess: () => toast.success('Deleted') })} className="text-text-muted opacity-0 transition hover:text-danger group-hover:opacity-100" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                          {isOpen && t.subtasks.length > 0 && (
                            <tr key={t.id + '-sub'} className="bg-muted/20">
                              <td colSpan={9} className="px-3 py-2">
                                <ul className="space-y-1 pl-6">
                                  {t.subtasks.map((s) => (
                                    <li key={s.id} className="flex items-center gap-2 text-xs">
                                      <span className={cn('h-1.5 w-1.5 rounded-full', s.isDone ? 'bg-success' : 'bg-text-muted')} />
                                      <span className={s.isDone ? 'text-text-muted line-through' : 'text-text-secondary'}>{s.title}</span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DateRangeFilter({ filter, setFilter }: { filter: FilterState; setFilter: (f: FilterState) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarRange className="h-3.5 w-3.5" />
          {filter.from || filter.to ? `${filter.from || '…'} → ${filter.to || '…'}` : 'Date range'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: filter.from ? parseDateOnly(filter.from) : undefined, to: filter.to ? parseDateOnly(filter.to) : undefined }}
          onSelect={(r) => {
            setFilter({ ...filter, from: r?.from ? toDateOnly(r.from) : undefined, to: r?.to ? toDateOnly(r.to) : undefined })
            if (r?.from && r?.to) setOpen(false)
          }}
          weekStartsOn={1}
        />
        {(filter.from || filter.to) && (
          <div className="border-t border-border p-2">
            <button onClick={() => { setFilter({ ...filter, from: undefined, to: undefined }) }} className="text-xs text-text-muted hover:text-text-primary">Clear range</button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function fmtDayHeader(date: string): string {
  const d = parseDateOnly(date)
  const today = todayDateOnly()
  const isToday = date === today
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}${isToday ? ' · Today' : ''}`
}
function fmtDayCell(date: string): string {
  return parseDateOnly(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function summarize(items: Task[]): string {
  const done = items.filter((t) => t.status === 'completed').length
  const skip = items.filter((t) => t.status === 'skipped').length
  const rate = items.length ? Math.round((done / items.length) * 100) : 0
  return `${done} done · ${skip} skipped · ${rate}%`
}
