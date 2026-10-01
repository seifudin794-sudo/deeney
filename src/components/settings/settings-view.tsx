'use client'

import { useState, useEffect } from 'react'
import { Palette, CalendarClock, Globe, Download, Trash2, Sparkles, Loader2, Database } from 'lucide-react'
import { useSettings, useUpdateSettings, useLoadDemo, useClearDemo, useMe } from '@/hooks/use-data'
import { useTheme } from 'next-themes'
import { PageHeader, LoadingCard } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TIMEZONES = ['Africa/Nairobi', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'UTC']

export function SettingsView() {
  const { data: settings, isLoading } = useSettings()
  const update = useUpdateSettings()
  const loadDemo = useLoadDemo()
  const clearDemo = useClearDemo()
  const { setTheme } = useTheme()
  const { data: me } = useMe()

  async function save(patch: Partial<typeof settings>) {
    try {
      await update.mutateAsync(patch)
      if (patch.theme) setTheme(patch.theme)
      toast.success('Settings saved')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (isLoading || !settings) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <LoadingCard key={i} />)}</div>

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Make Cadence yours." />

      <SectionCard icon={Palette} title="Appearance">
        <Row label="Theme" hint="Light, dark, or follow your system.">
          <div className="flex rounded-xl border border-border p-1">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => save({ theme: t })}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition', settings.theme === t ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:text-text-primary')}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>
      </SectionCard>

      <SectionCard icon={CalendarClock} title="Week & time">
        <Row label="Week starts on" hint="Affects calendar and charts.">
          <Select value={String(settings.weekStartsOn)} onValueChange={(v) => save({ weekStartsOn: Number(v) as 0 | 1 })}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="0">Sunday</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Timezone" hint="End-of-day and streaks calculate in this zone.">
          <Select value={settings.timezone} onValueChange={(v) => save({ timezone: v })}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
      </SectionCard>

      <SectionCard icon={Database} title="Demo data">
        <p className="mb-3 text-sm text-text-secondary">
          Preview the dashboard with ~60 days of realistic activity, then clear it to start fresh.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => loadDemo.mutate(undefined, { onSuccess: () => toast.success('Demo data loaded') })} disabled={loadDemo.isPending}>
            {loadDemo.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Load demo data
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-danger hover:text-danger" onClick={() => clearDemo.mutate(undefined, { onSuccess: () => toast.success('All tasks cleared') })} disabled={clearDemo.isPending}>
            {clearDemo.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Clear all tasks
          </Button>
        </div>
      </SectionCard>

      <SectionCard icon={Download} title="Export">
        <p className="mb-3 text-sm text-text-secondary">Download everything as a CSV, or generate a designed PDF report.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open('/api/export/csv', '_blank')}>
            <Download className="h-3.5 w-3.5" /> Export all (CSV)
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open('/api/export/pdf?range=last30', '_blank')}>
            <Download className="h-3.5 w-3.5" /> Export report (PDF)
          </Button>
        </div>
      </SectionCard>

      <SectionCard icon={Globe} title="Account">
        <Row label="Signed in as" hint="Your data is scoped to this account.">
          <span className="text-sm text-text-secondary">{me?.user?.email}</span>
        </Row>
      </SectionCard>

      <p className="px-1 text-center text-[11px] text-text-muted">
        Cadence · your personal task journal. Built with Next.js, Prisma, and Recharts.
      </p>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {hint && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  )
}
