import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { occursOn, parseDateOnly, addDays, todayDateOnly } from '@/lib/date'
import { ensureMarksAndAutoClose } from '@/app/api/marks/route'
import { serializeMark } from '@/lib/serialize'

// GET /api/tasks/[id]/history?from=&to=
// Returns the day-by-day history for a single task in the range (default: last 90 days up to today).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const task = await db.task.findUnique({ where: { id }, include: { category: true, subtasks: true } })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')

    const today = todayDateOnly()
    const toD = parseDateOnly(today)
    const fromD = addDays(toD, -89)
    const from = `${fromD.getFullYear()}-${String(fromD.getMonth() + 1).padStart(2, '0')}-${String(fromD.getDate()).padStart(2, '0')}`

    // Ensure marks exist + auto-close for this user's range.
    await ensureMarksAndAutoClose(user.id, from, today)

    const dates: Date[] = []
    const start = parseDateOnly(task.startDate)
    const lower = start > fromD ? start : fromD
    if (lower <= toD) {
      const cursor = new Date(lower)
      cursor.setHours(0, 0, 0, 0)
      while (cursor <= toD) {
        if (occursOn(task, cursor)) dates.push(new Date(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    const marks = await db.taskMark.findMany({ where: { taskId: id, dueDate: { gte: from, lte: today } } })
    const byDate = new Map(marks.map((m) => [m.dueDate, m]))

    const history = dates
      .map((d) => {
        const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const m = byDate.get(due)
        return m ? serializeMark(m) : { id: null, taskId: id, dueDate: due, status: 'pending', reason: null, autoMarked: false, markedAt: null }
      })
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))

    return NextResponse.json({ task, history })
  } catch (e) {
    return errorResponse(e)
  }
}
