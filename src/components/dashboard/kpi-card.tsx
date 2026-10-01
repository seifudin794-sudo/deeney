'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function KpiCard({
  label,
  value,
  suffix,
  delta,
  hint,
}: {
  label: string
  value: string | number
  suffix?: string
  delta?: number
  hint?: string
}) {
  const up = (delta ?? 0) > 0
  const down = (delta ?? 0) < 0
  const flat = !delta
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="tnum text-2xl font-semibold text-text-primary">{value}</span>
        {suffix && <span className="text-sm text-text-muted">{suffix}</span>}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {delta !== undefined && !flat && (
          <span
            className={cn(
              'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium tnum',
              up && 'bg-success/10 text-success',
              down && 'bg-danger/10 text-danger',
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
      </div>
    </div>
  )
}

export function delta(curr: number, prev: number): number | undefined {
  if (!prev && !curr) return undefined
  if (!prev) return 100
  return Math.round(((curr - prev) / prev) * 100)
}
