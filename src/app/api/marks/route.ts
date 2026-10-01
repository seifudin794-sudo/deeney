import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeMark } from '@/lib/serialize'
import { isPastAutoWindow, occursOn, parseDateOnly, todayDateOnly } from '@/lib/date'

// POST /api/marks?taskId=...&date=YYYY-MM-DD
// Body: { status: 'done' | 'not_done', reason?: string }
// - Ensures the task actually occurs on that date.
// - If status === 'not_done', a reason (>=2 chars) is required.
// - Clears autoMarked (user is taking manual ownership).
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = req.nextUrl
    const taskId = url.searchParams.get('taskId')
    const date = url.searchParams.get('date')
    if (!taskId || !date) throw new ResponseError(400, 'taskId and date are required')
    const body = await req.json().catch(() => ({}))
    const status = body.status as 'done' | 'not_done'

    const task = await db.task.findUnique({ where: { id: taskId } })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')

    if (!occursOn(task, parseDateOnly(date))) {
      throw new ResponseError(400, 'This task is not scheduled for that date')
    }

    const mark = await db.taskMark.findUnique({
      where: { taskId_dueDate: { taskId, dueDate: date } },
    })
    if (!mark) throw new ResponseError(404, 'Mark not found for that date')

    let reason: string | null = null
    if (status === 'not_done') {
      reason = String(body.reason || '').trim()
      if (reason.length < 2) throw new ResponseError(400, 'A reason is required when marking not done')
    }

    const updated = await db.taskMark.update({
      where: { id: mark.id },
      data: {
        status,
        reason: status === 'not_done' ? reason : null,
        autoMarked: false,
        markedAt: new Date(),
      },
    })
    return NextResponse.json(serializeMark(updated))
  } catch (e) {
    return errorResponse(e)
  }
}

// Helper exported for reuse: ensure marks exist + apply auto not-done rule
// for every occurrence of the user's tasks in [from, to]. Returns nothing;
// callers then read the marks fresh.
export async function ensureMarksAndAutoClose(userId: string, from: string, to: string) {
  const tasks = await db.task.findMany({ where: { userId } })
  const today = todayDateOnly()
  const fromD = parseDateOnly(from)
  const toD = parseDateOnly(to)
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
    for (const d of dates) {
      const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      let mark = await db.taskMark.findUnique({ where: { taskId_dueDate: { taskId: t.id, dueDate: due } } })
      if (!mark) {
        mark = await db.taskMark.create({
          data: { taskId: t.id, userId, dueDate: due, status: 'pending' },
        })
      }
      // AUTO NOT-DONE: flip pending → not_done once 48h past due date end.
      if (mark.status === 'pending' && isPastAutoWindow(due)) {
        mark = await db.taskMark.update({
          where: { id: mark.id },
          data: {
            status: 'not_done',
            reason: 'Not marked within 48 hours',
            autoMarked: true,
            markedAt: new Date(),
          },
        })
      }
    }
  }
  void today
}
