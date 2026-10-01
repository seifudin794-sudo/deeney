'use client'

import { cn } from '@/lib/utils'
import { PRIORITY_META, REPEAT_META } from '@/lib/types'
import type { Category, MarkStatus, Priority, RepeatType } from '@/lib/types'

export function CategoryPill({ category, className }: { category?: Category | null; className?: string }) {
  if (!category) return null
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', className)}
      style={{ backgroundColor: `${category.color}22`, color: category.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
      {category.name}
    </span>
  )
}

export function CategoryDot({ category }: { category?: { color: string; name: string } | null }) {
  if (!category) return <span className="h-2.5 w-2.5 rounded-full bg-text-muted" />
  return (
    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} title={category.name} />
  )
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const p = PRIORITY_META[priority]
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: `color-mix(in srgb, ${p.color} 14%, transparent)`, color: p.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
      {p.label}
    </span>
  )
}

export function RepeatPill({ repeatType }: { repeatType: RepeatType }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-soft">
      {REPEAT_META[repeatType].label}
    </span>
  )
}

export function StatusBadge({ status }: { status: MarkStatus }) {
  const map = {
    done: { label: 'Done', color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 14%, transparent)' },
    not_done: { label: 'Not done', color: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 14%, transparent)' },
    pending: { label: 'Pending', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 14%, transparent)' },
  } as const
  const s = map[status]
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  )
}
