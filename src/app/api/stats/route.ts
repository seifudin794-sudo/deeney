import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { occursOn, parseDateOnly } from '@/lib/date'
import { ensureMarksAndAutoClose } from '@/app/api/marks/route'
import { serializeMark } from '@/lib/serialize'

// GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns dashboard overview + per-task progress + recent not-done reasons.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = req.nextUrl
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

    // Ensure marks exist and auto-close overdue ones first.
    await ensureMarksAndAutoClose(user.id, from, to)

    const tasks = await db.task.findMany({
      where: { userId: user.id },
      include: { category: true, subtasks: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    const fromD = parseDateOnly(from)
    const toD = parseDateOnly(to)

    type DayDot = { date: string; status: string; auto: boolean; reason: string | null }
    type TaskProgress = {
      task: (typeof tasks)[number]
      days: DayDot[]
      doneCount: number
      notDoneCount: number
      pendingCount: number
      totalDays: number
      completionRate: number
      todayStatus: string
    }

    const taskProgress: TaskProgress[] = []
    let totalDone = 0
    let totalNotDone = 0
    let totalPending = 0
    const recentNotDone: any[] = []

    const todayStr = todayStrOnly()

    for (const t of tasks) {
      const dates: Date[] = []
      const start = parseDateOnly(t.startDate)
      const lower = start > fromD ? start : fromD
      if (lower <= toD) {
        const cursor = new Date(lower)
        cursor.setHours(0, 0, 0, 0)
        while (cursor <= toD) {
          if (occursOn(t, cursor)) dates.push(new Date(cursor))
          cursor.setDate(cursor.getDate() + 1)
        }
      }
      if (dates.length === 0) continue

      const marks = await db.taskMark.findMany({
        where: { taskId: t.id, dueDate: { gte: from, lte: to } },
      })
      const markByDate = new Map(marks.map((m) => [m.dueDate, m]))

      const days: DayDot[] = dates.map((d) => {
        const due = dateOnlyStr(d)
        const m = markByDate.get(due)
        const status = m?.status || 'pending'
        return { date: due, status, auto: m?.autoMarked ?? false, reason: m?.reason ?? null }
      })

      const doneCount = days.filter((d) => d.status === 'done').length
      const notDoneCount = days.filter((d) => d.status === 'not_done').length
      const pendingCount = days.filter((d) => d.status === 'pending').length
      const completionRate = days.length ? Math.round((doneCount / days.length) * 100) : 0

      // today's status — the most recent occurrence <= today
      let todayStatus = 'none'
      for (const d of [...days].reverse()) {
        if (d.date <= todayStr) {
          todayStatus = d.status
          break
        }
      }

      totalDone += doneCount
      totalNotDone += notDoneCount
      totalPending += pendingCount

      for (const d of days) {
        if (d.status === 'not_done' && d.reason) {
          recentNotDone.push({ date: d.date, taskName: t.name, reason: d.reason, auto: d.auto, categoryName: t.category?.name, categoryColor: t.category?.color })
        }
      }

      taskProgress.push({
        task: t,
        days,
        doneCount,
        notDoneCount,
        pendingCount,
        totalDays: days.length,
        completionRate,
        todayStatus,
      })
    }

    const total = totalDone + totalNotDone + totalPending
    const overallRate = total ? Math.round((totalDone / total) * 100) : 0

    recentNotDone.sort((a, b) => b.date.localeCompare(a.date))

    return NextResponse.json({
      range: { from, to },
      summary: { done: totalDone, notDone: totalNotDone, pending: totalPending, total, overallRate },
      taskProgress: taskProgress.map((tp) => ({
        taskId: tp.task.id,
        taskName: tp.task.name,
        categoryId: tp.task.categoryId,
        categoryName: tp.task.category?.name || null,
        categoryColor: tp.task.category?.color || null,
        priority: tp.task.priority,
        repeatType: tp.task.repeatType,
        startDate: tp.task.startDate,
        doneCount: tp.doneCount,
        notDoneCount: tp.notDoneCount,
        pendingCount: tp.pendingCount,
        totalDays: tp.totalDays,
        completionRate: tp.completionRate,
        todayStatus: tp.todayStatus,
        days: tp.days,
        subtaskCount: tp.task.subtasks.length,
      })),
      recentNotDone: recentNotDone.slice(0, 8),
      // History for a single task (used by the side panel). We return all tasks' marks here; the client fetches a focused task's history via this same endpoint + filter client-side — but for efficiency we also expose a per-task marks list.
      marks: taskProgress.flatMap((tp) =>
        tp.days.map((d) => ({ taskId: tp.task.id, dueDate: d.date, status: d.status, auto: d.auto, reason: d.reason })),
      ),
    })
  } catch (e) {
    return errorResponse(e)
  }
}

function todayStrOnly(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function dateOnlyStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
