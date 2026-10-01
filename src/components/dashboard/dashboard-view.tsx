'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Target,
  SkipForward,
  Flame,
  Trophy,
  ListChecks,
  Download,
  Loader2,
} from 'lucide-react'
import { useStats, useCategories } from '@/hooks/use-data'
import { useUI } from '@/store/ui'
import { KpiCard, delta } from '@/components/dashboard/kpi-card'
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap'
import { PageHeader, LoadingCard, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { exportUrl } from '@/lib/api'
import { parseDateOnly } from '@/lib/date'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
  ComposedChart,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toDateOnly } from '@/lib/date'

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'custom', label: 'Custom' },
] as const

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DashboardView() {
  const [range, setRange] = useState<string>('last30')
  const [from, setFrom] = useState<string | undefined>()
  const [to, setTo] = useState<string | undefined>()
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [calOpen, setCalOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const { openDayDrawer } = useUI()
  const { data: categories } = useCategories()

  const params = {
    range,
    from,
    to,
    categories: selectedCats.length ? selectedCats.join(',') : undefined,
  }
  const { data, isLoading, error, refetch } = useStats(params)

  const handleRange = (k: string) => {
    setRange(k)
    if (k !== 'custom') {
      setFrom(undefined)
      setTo(undefined)
    } else {
      setCalOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Step back and see the shape of your week.">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => window.open(exportUrl.pdf(params), '_blank')}
        >
          <Download className="h-3.5 w-3.5" /> Export PDF
        </Button>
      </PageHeader>

      {/* range + category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-border bg-surface p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => handleRange(r.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                range === r.key ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (from || to) && (
          <span className="tnum rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text-secondary">
            {from || '…'} → {to || '…'}
          </span>
        )}

        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              Categories {selectedCats.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{selectedCats.length}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCats([])}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted',
                  selectedCats.length === 0 && 'text-primary',
                )}
              >
                All categories
              </button>
              {(categories || []).map((c) => {
                const active = selectedCats.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      setSelectedCats((s) => (active ? s.filter((x) => x !== c.id) : [...s, c.id]))
                    }
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted',
                      active && 'bg-primary/5 text-primary',
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {calOpen && (
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">Pick custom range</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: from ? parseDateOnly(from) : undefined,
                to: to ? parseDateOnly(to) : undefined,
              }}
              onSelect={(r) => {
                if (r?.from) setFrom(toDateOnly(r.from))
                if (r?.to) setTo(toDateOnly(r.to))
                if (r?.from && r?.to) setCalOpen(false)
              }}
              numberOfMonths={2}
              weekStartsOn={1}
            />
          </PopoverContent>
        </Popover>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Couldn't load your stats." onRetry={() => refetch()} />
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Completed" value={data.kpis.completed} delta={delta(data.kpis.completed, data.kpis.completedPrev)} hint="vs prev period" />
            <KpiCard label="Completion" value={data.kpis.completionRate} suffix="%" delta={delta(data.kpis.completionRate, data.kpis.completionRatePrev)} hint="vs prev period" />
            <KpiCard label="Skipped" value={data.kpis.skipped} delta={delta(data.kpis.skipped, data.kpis.skippedPrev)} hint="vs prev period" />
            <KpiCard label="Current streak" value={data.kpis.currentStreak} suffix="days" hint="in a row" />
            <KpiCard label="Longest streak" value={data.kpis.longestStreak} suffix="days" hint="all-time best" />
            <KpiCard label="Subtasks" value={data.kpis.subtasksCompleted} delta={delta(data.kpis.subtasksCompleted, data.kpis.subtasksCompletedPrev)} hint="done" />
          </div>

          {/* heatmap */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary">Activity — last 12 months</h3>
            <p className="mb-4 text-xs text-text-muted">Click any day to read it like a journal entry.</p>
            <ActivityHeatmap />
          </div>

          {/* charts row */}
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="Daily completion" subtitle="Completed vs skipped vs pending">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data.daily} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={fmtDay} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
                  <RTooltip content={<DayTip />} />
                  <Bar dataKey="completed" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="skipped" stackId="a" stackOffset="sign" fill="var(--skipped)" />
                  <Bar dataKey="pending" stackId="a" fill="var(--text-muted)" radius={[3, 3, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Completion rate trend" subtitle="% completed over time">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.daily.map((d) => ({ ...d, rate: d.completed + d.skipped + d.pending ? Math.round((d.completed / (d.completed + d.skipped + d.pending)) * 100) : 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={fmtDay} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
                  <RTooltip content={<RateTip />} />
                  <Line type="monotone" dataKey="rate" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* category + skip analysis */}
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard title="Category breakdown" subtitle="Completed tasks by category">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.categoryBreakdown} dataKey="completed" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {data.categoryBreakdown.map((c: any, i: number) => (
                          <Cell key={i} fill={c.color} />
                        ))}
                      </Pie>
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="tnum text-2xl font-semibold text-text-primary">{data.kpis.completed}</span>
                    <span className="text-[10px] text-text-muted">completed</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {data.categoryBreakdown.length === 0 && <p className="text-xs text-text-muted">No data in range.</p>}
                  {data.categoryBreakdown.map((c: any) => (
                    <div key={c.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="flex-1 text-text-secondary">{c.name}</span>
                      <span className="tnum text-text-muted">{c.completed}/{c.total}</span>
                      <span className="tnum w-9 text-right font-medium text-text-primary">{c.rate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Skip analysis" subtitle="Where you skip most">
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">Top reasons</p>
                  <div className="space-y-1.5">
                    {data.skipAnalysis.reasons.length === 0 && <p className="text-xs text-text-muted">No skips this period — beautifully done.</p>}
                    {data.skipAnalysis.reasons.slice(0, 5).map((r: any) => {
                      const max = Math.max(...data.skipAnalysis.reasons.map((x: any) => x.count), 1)
                      return (
                        <div key={r.reason} className="flex items-center gap-2">
                          <span className="w-32 truncate text-xs text-text-secondary">{r.reason}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-skipped" style={{ width: `${(r.count / max) * 100}%` }} />
                          </div>
                          <span className="tnum w-5 text-right text-xs text-text-muted">{r.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">Skips by weekday</p>
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={data.skipAnalysis.byWeekday}>
                      <XAxis dataKey="weekday" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={(d) => WEEKDAY_NAMES[d]} />
                      <RTooltip content={<WeekdayTip />} />
                      <Bar dataKey="count" fill="var(--skipped)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* recent skips */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-text-primary">Recent skip reasons</h3>
            <p className="mb-3 text-xs text-text-muted">Your own honest record — read it back.</p>
            {data.recentSkips.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
                No skipped tasks in this range.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {data.recentSkips.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => openDayDrawer(s.date)}
                    className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface-elevated px-3.5 py-2.5 text-left transition hover:border-primary/30"
                  >
                    <div className="w-16 shrink-0">
                      <p className="tnum text-xs font-medium text-text-primary">{fmtShort(s.date)}</p>
                      <p className="text-[10px] text-text-muted">{WEEKDAY_NAMES[parseDateOnly(s.date).getDay()]}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-text-primary">{s.title}</p>
                      <p className="mt-0.5 text-xs italic text-text-secondary">“{s.reason}”</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {subtitle && <p className="mb-3 text-xs text-text-muted">{subtitle}</p>}
      {children}
    </div>
  )
}

function fmtDay(s: string) {
  const d = parseDateOnly(s)
  return `${d.getDate()}/${d.getMonth() + 1}`
}
function fmtShort(s: string) {
  return parseDateOnly(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function DayTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-text-primary">{fmtShort(d.date)}</p>
      <p className="text-success">✓ {d.completed} completed</p>
      <p className="text-skipped">− {d.skipped} skipped</p>
      <p className="text-text-muted">○ {d.pending} pending</p>
    </div>
  )
}
function RateTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-text-primary">{fmtShort(d.date)}</p>
      <p className="text-primary">{d.rate}% completed</p>
    </div>
  )
}
function WeekdayTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5 text-xs shadow-md">
      <p className="text-text-primary">{WEEKDAY_NAMES[payload[0].payload.weekday]}: {payload[0].value} skips</p>
    </div>
  )
}
