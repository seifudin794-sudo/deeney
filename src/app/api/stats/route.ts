import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { occursOn, parseDateOnly, isPastAutoWindow } from '@/lib/date'
import { ensureMarksAndAutoClose } from '@/app/api/marks/route'

// GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns dashboard overview + per-task progress + recent not-done reasons.
//
// KEY RULE: subtasks are treated as main tasks.
// - A task WITH subtasks: its status is DERIVED from its subtasks. Each subtask
//   counts as an individual item (done / pending / not_done after auto-close).
//   The task is "done" only when ALL its subtasks are done; otherwise "pending"
//   (or "not_done" once past the 48h auto-close window).
// - A task WITHOUT subtasks: uses its own TaskMark (done / pending / not_done).
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = req.nextUrl
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) return NextResponse.json({ error: 'from and to required' }, { status: 400 })

    // Ensure marks exist and auto-close overdue task-level marks first.
    await ensureMarksAndAutoClose(user.id, from, to)

    const tasks = await db.task.findMany({
      where: { userId: user.id },
      include: { category: true, subtasks: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    const fromD = parseDateOnly(from)
    const toD = parseDateOnly(to)

    type DayDot = { date: string; status: string; auto: boolean; reason: string | null; subtasks: Record<string, string> }
    type TaskProgress = {
      task: (typeof tasks)[number]
      days: DayDot[]
      doneCount: number
      notDoneCount: number
      pendingCount: number
      totalDays: number
      completionRate: number
      todayStatus: string
      hasSubtasks: boolean
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

      const hasSubtasks = t.subtasks.length > 0

      const marks = await db.taskMark.findMany({
        where: { taskId: t.id, dueDate: { gte: from, lte: to } },
      })
      const markByDate = new Map(marks.map((m) => [m.dueDate, m]))

      // Subtask marks for this task in the range.
      const subtaskIds = t.subtasks.map((s) => s.id)
      const subtaskMarks = subtaskIds.length
        ? await db.subtaskMark.findMany({
            where: { subtaskId: { in: subtaskIds }, dueDate: { gte: from, lte: to } },
          })
        : []
      // Map: dueDate -> { subtaskId -> rawStatus }
      const subtaskByDate = new Map<string, Record<string, string>>()
      for (const sm of subtaskMarks) {
        if (!subtaskByDate.has(sm.dueDate)) subtaskByDate.set(sm.dueDate, {})
        subtaskByDate.get(sm.dueDate)![sm.subtaskId] = sm.status
      }

      const days: DayDot[] = dates.map((d) => {
        const due = dateOnlyStr(d)
        const m = markByDate.get(due)
        const subtaskStates = subtaskByDate.get(due) || {}

        let status: string
        let auto: boolean
        let reason: string | null

        if (hasSubtasks) {
          // Derive task status from subtask marks.
          // Each subtask's effective status: 'done' if marked done, else
          // 'not_done' if past the auto-close window, else 'pending'.
          const subIds = t.subtasks.map((s) => s.id)
          const subStatuses = subIds.map((sid) => {
            const raw = subtaskStates[sid] || 'pending'
            if (raw === 'done') return 'done'
            return isPastAutoWindow(due) ? 'not_done' : 'pending'
          })
          const allDone = subStatuses.every((s) => s === 'done')
          const anyNotDone = subStatuses.some((s) => s === 'not_done')
          status = allDone ? 'done' : anyNotDone ? 'not_done' : 'pending'
          auto = anyNotDone && !allDone
          reason = anyNotDone && !allDone ? 'Not marked within 48 hours' : null
          // Expose effective subtask statuses to the client.
          const effectiveSubtasks: Record<string, string> = {}
          subIds.forEach((sid, i) => {
            effectiveSubtasks[sid] = subStatuses[i]
          })
          return { date: due, status, auto, reason, subtasks: effectiveSubtasks }
        } else {
          // No subtasks — use the task mark directly.
          status = m?.status || 'pending'
          auto = m?.autoMarked ?? false
          reason = m?.reason ?? null
          return { date: due, status, auto, reason, subtasks: subtaskStates }
        }
      })

      const doneCount = days.filter((d) => d.status === 'done').length
      const notDoneCount = days.filter((d) => d.status === 'not_done').length
      const pendingCount = days.filter((d) => d.status === 'pending').length

      // completionRate: for tasks with subtasks, it's based on subtask completion.
      // For tasks without subtasks, it's the task mark rate.
      let completionRate: number
      if (hasSubtasks) {
        // Count done subtasks across all days vs total subtask-slots
        let doneSubs = 0
        let totalSubs = 0
        for (const d of days) {
          for (const v of Object.values(d.subtasks)) {
            totalSubs++
            if (v === 'done') doneSubs++
          }
        }
        completionRate = totalSubs ? Math.round((doneSubs / totalSubs) * 100) : 0
      } else {
        completionRate = days.length ? Math.round((doneCount / days.length) * 100) : 0
      }

      // today's status — the most recent occurrence <= today
      let todayStatus = 'none'
      for (const d of [...days].reverse()) {
        if (d.date <= todayStr) {
          todayStatus = d.status
          break
        }
      }

      // Count items for the summary.
      if (hasSubtasks) {
        // Each subtask is an individual item.
        for (const d of days) {
          for (const v of Object.values(d.subtasks)) {
            if (v === 'done') totalDone++
            else if (v === 'not_done') totalNotDone++
            else totalPending++
          }
        }
      } else {
        totalDone += doneCount
        totalNotDone += notDoneCount
        totalPending += pendingCount
      }

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
        hasSubtasks,
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
        time: tp.task.time ?? null,
        hasSubtasks: tp.hasSubtasks,
        doneCount: tp.doneCount,
        notDoneCount: tp.notDoneCount,
        pendingCount: tp.pendingCount,
        totalDays: tp.totalDays,
        completionRate: tp.completionRate,
        todayStatus: tp.todayStatus,
        days: tp.days,
        subtaskCount: tp.task.subtasks.length,
        subtasks: tp.task.subtasks.map((s) => ({ id: s.id, title: s.title, sortOrder: s.sortOrder })).sort((a, b) => a.sortOrder - b.sortOrder),
      })),
      recentNotDone: recentNotDone.slice(0, 8),
      marks: taskProgress.flatMap((tp) =>
        tp.days.map((d) => ({ taskId: tp.task.id, dueDate: d.date, status: d.status, auto: d.auto, reason: d.reason, subtasks: d.subtasks })),
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
