import type { RepeatType } from '@/lib/types'

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function toDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayDateOnly(): string {
  return toDateOnly(new Date())
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfWeek(date: Date, weekStartsOn: 0 | 1 = 1): Date {
  return addDays(startOfWeek(date, weekStartsOn), 6)
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function diffDays(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((da.getTime() - db.getTime()) / MS_PER_DAY)
}

// Does the task's repeat rule produce an occurrence on `date`?
export function occursOn(task: { repeatType: RepeatType; startDate: string }, date: Date): boolean {
  const start = parseDateOnly(task.startDate)
  if (date < start) return false
  const dStart = start.getDay()
  switch (task.repeatType) {
    case 'daily':
      return true
    case 'every_3_days':
      return diffDays(date, start) % 3 === 0
    case 'weekly':
      return date.getDay() === dStart
    default:
      return false
  }
}

// All occurrence dates for a task within [from, to] inclusive.
export function occurrenceDates(task: { repeatType: RepeatType; startDate: string }, from: Date, to: Date): Date[] {
  const out: Date[] = []
  const start = parseDateOnly(task.startDate)
  const lower = start > from ? start : from
  if (lower > to) return out
  const cursor = new Date(lower)
  cursor.setHours(0, 0, 0, 0)
  while (cursor <= to) {
    if (occursOn(task, cursor)) out.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

// AUTO NOT-DONE RULE: a pending mark is auto-flipped to not_done once
// "48 hours after its due date ends" has passed — i.e. when today is at least
// 3 calendar days after the due date (end_of_due_date + 48h).
export function isPastAutoWindow(dueDate: string, now: Date = new Date()): boolean {
  const due = parseDateOnly(dueDate)
  return diffDays(now, due) >= 3
}

export function weekdayShort(d: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] || ''
}

export function monthShort(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] || ''
}

export function formatDateLong(s: string): string {
  return parseDateOnly(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
export function formatDateShort(s: string): string {
  return parseDateOnly(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
export function formatDateMed(s: string): string {
  return parseDateOnly(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
