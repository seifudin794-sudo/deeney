'use client'

import { cn } from '@/lib/utils'
import type { Category, Priority } from '@/lib/types'

export function CategoryPill({ category, className }: { category?: Category | null; className?: string }) {
  if (!category) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        className,
      )}
      style={{
        backgroundColor: `${category.color}22`,
        color: category.color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </span>
  )
}

const PRIORITY_STYLES: Record<Priority, { label: string; color: string }> = {
  high: { label: 'High', color: 'var(--danger)' },
  medium: { label: 'Med', color: 'var(--warning)' },
  low: { label: 'Low', color: 'var(--text-muted)' },
}

export function PriorityMarker({ priority }: { priority: Priority }) {
  const s = PRIORITY_STYLES[priority]
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium"
      style={{ color: s.color }}
      title={`${s.label} priority`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
      {s.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: 'pending' | 'completed' | 'skipped' }) {
  const map = {
    pending: { label: 'Pending', color: 'var(--text-muted)', bg: 'var(--surface-elevated)' },
    completed: { label: 'Done', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 14%, transparent)' },
    skipped: { label: 'Skipped', color: 'var(--skipped)', bg: 'color-mix(in srgb, var(--skipped) 14%, transparent)' },
  } as const
  const s = map[status]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  )
}

export function SubtaskProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="tnum text-[11px] text-text-muted">
        {done}/{total}
      </span>
    </div>
  )
}
