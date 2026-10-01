import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { addDays, addMonths, parseDateOnly, parseDateOnlyStr, startOfMonth, startOfWeek, todayDateOnly } from '@/lib/date'
import { SKIP_REASON_CHIPS } from '@/lib/types'

type RangeKey = 'today' | 'week' | 'month' | 'last30' | 'custom'

function getRange(key: RangeKey, customFrom?: string, customTo?: string, weekStartsOn: 0 | 1 = 1) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let from: Date
  let to: Date = new Date(today)
  switch (key) {
    case 'today':
      from = new Date(today)
      break
    case 'week':
      from = startOfWeek(today, weekStartsOn)
      break
    case 'month':
      from = startOfMonth(today)
      break
    case 'last30':
      from = addDays(today, -29)
      break
    case 'custom':
      from = customFrom ? parseDateOnly(customFrom) : addDays(today, -6)
      to = customTo ? parseDateOnly(customTo) : new Date(today)
      break
  }
  return { from, to }
}

function prevRange(from: Date, to: Date) {
  const spanDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
  const prevTo = addDays(from, -1)
  const prevFrom = addDays(prevTo, -(spanDays - 1))
  return { from: prevFrom, to: prevTo }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = req.nextUrl
    const rangeKey = (url.searchParams.get('range') || 'last30') as RangeKey
    const settings = await db.settings.findUnique({ where: { userId: user.id } })
    const weekStartsOn = (settings?.weekStartsOn ?? 1) as 0 | 1
    const from = url.searchParams.get('from') || undefined
    const to = url.searchParams.get('to') || undefined
    const catParam = url.searchParams.get('categories')
    const categories = catParam ? catParam.split(',').filter(Boolean) : undefined

    const { from: rf, to: rt } = getRange(rangeKey, from, to, weekStartsOn)
    const { from: pf, to: pt } = prevRange(rf, rt)

    const catFilter = categories ? { categoryId: { in: categories } } : {}

    // Range + previous range tasks
    const rangeTasks = await db.task.findMany({
      where: { userId: user.id, dueDate: { gte: parseDateOnlyStr(rf), lte: parseDateOnlyStr(rt) }, ...catFilter },
      include: { category: true, subtasks: true },
    })
    const prevTasks = await db.task.findMany({
      where: { userId: user.id, dueDate: { gte: parseDateOnlyStr(pf), lte: parseDateOnlyStr(pt) }, ...catFilter },
      include: { subtasks: true },
    })

    // 365-day window for streaks
    const heatFrom = addDays(new Date(), -364)
    const allYearTasks = await db.task.findMany({
      where: { userId: user.id, dueDate: { gte: parseDateOnlyStr(heatFrom) }, ...catFilter },
      select: { dueDate: true, status: true },
    })

    const completed = rangeTasks.filter((t) => t.status === 'completed').length
    const skipped = rangeTasks.filter((t) => t.status === 'skipped').length
    const total = rangeTasks.length
    const completionRate = total ? Math.round((completed / total) * 100) : 0
    const subtasksCompleted = rangeTasks.reduce(
      (acc, t) => acc + t.subtasks.filter((s) => s.isDone).length,
      0,
    )

    const prevCompleted = prevTasks.filter((t) => t.status === 'completed').length
    const prevTotal = prevTasks.length
    const prevCompletionRate = prevTotal ? Math.round((prevCompleted / prevTotal) * 100) : 0
    const prevSkipped = prevTasks.filter((t) => t.status === 'skipped').length
    const prevSubtasks = prevTasks.reduce((acc, t) => acc + t.subtasks.filter((s) => s.isDone).length, 0)

    // streaks
    const { currentStreak, longestStreak } = computeStreaks(allYearTasks)

    // daily series
    const dayMap = new Map<string, { completed: number; skipped: number; pending: number }>()
    const cursor = new Date(rf)
    while (cursor <= rt) {
      dayMap.set(parseDateOnlyStr(cursor), { completed: 0, skipped: 0, pending: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    for (const t of rangeTasks) {
      const d = dayMap.get(t.dueDate)
      if (!d) continue
      if (t.status === 'completed') d.completed++
      else if (t.status === 'skipped') d.skipped++
      else d.pending++
    }
    const daily = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }))

    // category breakdown (completed tasks by category)
    const catMap = new Map<string, { name: string; color: string; completed: number; total: number; skipped: number }>()
    for (const t of rangeTasks) {
      const key = t.categoryId || 'none'
      const c = t.category
      if (!catMap.has(key)) catMap.set(key, { name: c?.name || 'Uncategorized', color: c?.color || '#64748b', completed: 0, total: 0, skipped: 0 })
      const e = catMap.get(key)!
      e.total++
      if (t.status === 'completed') e.completed++
      if (t.status === 'skipped') e.skipped++
    }
    const categoryBreakdown = Array.from(catMap.values()).map((c) => ({
      ...c,
      rate: c.total ? Math.round((c.completed / c.total) * 100) : 0,
    }))

    // skip analysis
    const skipTasks = rangeTasks.filter((t) => t.status === 'skipped')
    const reasonMap = new Map<string, number>()
    for (const t of skipTasks) {
      const r = (t.skipReason || 'Other').trim()
      const chip = SKIP_REASON_CHIPS.find((c) => c.toLowerCase() === r.toLowerCase())
      const key = chip || 'Other'
      reasonMap.set(key, (reasonMap.get(key) || 0) + 1)
    }
    const reasons = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)

    const byCategory = Array.from(catMap.values())
      .map((c) => ({ name: c.name, color: c.color, count: c.skipped }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)

    const byWeekday = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      weekday: dow,
      count: skipTasks.filter((t) => parseDateOnly(t.dueDate).getDay() === dow).length,
    }))

    const recentSkips = skipTasks
      .sort((a, b) => (b.skipLoggedAt?.getTime() || 0) - (a.skipLoggedAt?.getTime() || 0))
      .slice(0, 12)
      .map((t) => ({ id: t.id, date: t.dueDate, title: t.title, reason: t.skipReason || '' }))

    return NextResponse.json({
      range: { from: parseDateOnlyStr(rf), to: parseDateOnlyStr(rt) },
      prev: { from: parseDateOnlyStr(pf), to: parseDateOnlyStr(pt) },
      kpis: {
        completed,
        completedPrev: prevCompleted,
        completionRate,
        completionRatePrev: prevCompletionRate,
        skipped,
        skippedPrev: prevSkipped,
        currentStreak,
        longestStreak,
        subtasksCompleted,
        subtasksCompletedPrev: prevSubtasks,
        total,
      },
      daily,
      categoryBreakdown,
      skipAnalysis: { reasons, byCategory, byWeekday },
      recentSkips,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

function computeStreaks(tasks: { dueDate: string; status: string }[]) {
  const byDay = new Map<string, { planned: number; completed: number; pending: number }>()
  for (const t of tasks) {
    const d = t.dueDate
    if (!byDay.has(d)) byDay.set(d, { planned: 0, completed: 0, pending: 0 })
    const e = byDay.get(d)!
    e.planned++
    if (t.status === 'completed') e.completed++
    if (t.status === 'pending') e.pending++
  }
  const today = todayDateOnly()
  // current streak: walk back from today
  let currentStreak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  let started = false
  for (let i = 0; i < 400; i++) {
    const key = parseDateOnlyStr(cursor)
    const e = byDay.get(key)
    if (!e || e.planned === 0) {
      // neutral day — doesn't break, but only counts if streak already started? keep going
      cursor = addDays(cursor, -1)
      continue
    }
    if (e.completed >= 1 && e.pending === 0) {
      currentStreak++
      started = true
    } else {
      if (started) break
      // before streak started, a failing day breaks (stays 0)
      break
    }
    cursor = addDays(cursor, -1)
  }
  // longest streak over the window
  let longest = 0
  let run = 0
  const sorted = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  let prevDate: Date | null = null
  for (const [date, e] of sorted) {
    const d = parseDateOnly(date)
    if (prevDate && addDays(prevDate, 1).getTime() !== d.getTime()) {
      // gap — neutral days in between don't break; only a failing day breaks
    }
    prevDate = d
    if (e.planned === 0) continue // neutral
    if (e.completed >= 1 && e.pending === 0) {
      run++
      longest = Math.max(longest, run)
    } else {
      run = 0
    }
  }
  return { currentStreak, longestStreak: Math.max(longest, currentStreak) }
}
