import { RecurrenceRule } from '@/lib/types'

const WEEK = 7

export function toDateOnly(d: Date): string {
  // Local date as YYYY-MM-DD (avoids UTC drift).
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

// Same as toDateOnly but takes a Date — kept as a separate name for clarity at call sites.
export function parseDateOnlyStr(d: Date): string {
  return toDateOnly(d)
}

export function todayDateOnly(): string {
  return toDateOnly(new Date())
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function diffDays(a: Date, b: Date): number {
  const ms = 1000 * 60 * 60 * 24
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((da.getTime() - db.getTime()) / ms)
}

// Does this recurrence rule produce an occurrence on `date`?
export function ruleMatches(
  rule: RecurrenceRule,
  weekdays: string | null,
  date: Date,
): boolean {
  const dow = date.getDay() // 0 Sun .. 6 Sat
  switch (rule) {
    case 'daily':
      return true
    case 'weekdays':
      if (!weekdays) return dow >= 1 && dow <= 5
      const set = weekdays.split(',').map((s) => Number(s))
      return set.includes(dow)
    case 'weekly':
      return true // one per week — handled by week-of selection
    case 'monthly':
      return true // one per month — handled by month-of selection
    default:
      return false
  }
}

// Generate the occurrence date list for a recurring template over [from, to].
export function occurrencesFor(
  template: {
    rule: RecurrenceRule
    weekdays: string | null
    startDate: string
    endDate: string | null
  },
  from: Date,
  to: Date,
): Date[] {
  const start = parseDateOnly(template.startDate)
  const end = template.endDate ? parseDateOnly(template.endDate) : null
  const out: Date[] = []
  const lower = start > from ? start : from
  if (lower > to) return out
  if (end && end < lower) return out

  if (template.rule === 'daily' || template.rule === 'weekdays') {
    let cursor = new Date(lower)
    cursor.setHours(0, 0, 0, 0)
    while (cursor <= to) {
      if (end && cursor > end) break
      if (ruleMatches(template.rule, template.weekdays, cursor)) {
        out.push(new Date(cursor))
      }
      cursor = addDays(cursor, 1)
    }
    return out
  }

  if (template.rule === 'weekly') {
    // One occurrence per week — anchor on the start date's weekday.
    const anchorDow = start.getDay()
    let cursor = new Date(lower)
    cursor.setHours(0, 0, 0, 0)
    // advance to first matching weekday >= lower
    while (cursor.getDay() !== anchorDow && cursor <= to) {
      cursor = addDays(cursor, 1)
    }
    while (cursor <= to) {
      if (end && cursor > end) break
      out.push(new Date(cursor))
      cursor = addDays(cursor, WEEK)
    }
    return out
  }

  if (template.rule === 'monthly') {
    const anchorDay = start.getDate()
    let cursor = new Date(lower.getFullYear(), lower.getMonth(), 1)
    while (cursor <= to) {
      const day = Math.min(anchorDay, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate())
      const occ = new Date(cursor.getFullYear(), cursor.getMonth(), day)
      if (occ >= lower && occ <= to && (!end || occ <= end)) {
        out.push(occ)
      }
      cursor = addMonths(cursor, 1)
    }
    return out
  }
  return out
}

export function weekdayName(dow: number, short = false): string {
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const n = names[dow] || ''
  return short ? n.slice(0, 3) : n
}

export function monthName(m: number, short = false): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const n = names[m] || ''
  return short ? n.slice(0, 3) : n
}
