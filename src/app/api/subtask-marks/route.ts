import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeSubtaskMark } from '@/lib/serialize'
import { occursOn, parseDateOnly } from '@/lib/date'

// POST /api/subtask-marks?subtaskId=...&date=YYYY-MM-DD
// Body: { status: 'done' | 'pending' }
// Toggles an individual subtask's mark for the given day.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = req.nextUrl
    const subtaskId = url.searchParams.get('subtaskId')
    const date = url.searchParams.get('date')
    if (!subtaskId || !date) throw new ResponseError(400, 'subtaskId and date are required')
    const body = await req.json().catch(() => ({}))
    const status = body.status as 'done' | 'pending'

    const subtask = await db.subtask.findUnique({ where: { id: subtaskId }, include: { task: true } })
    if (!subtask || subtask.userId !== user.id) throw new ResponseError(404, 'Subtask not found')
    // The parent task must occur on that date.
    if (!occursOn(subtask.task, parseDateOnly(date))) {
      throw new ResponseError(400, 'This task is not scheduled for that date')
    }

    // Ensure a SubtaskMark row exists, then update it.
    let mark = await db.subtaskMark.findUnique({
      where: { subtaskId_dueDate: { subtaskId, dueDate: date } },
    })
    if (!mark) {
      mark = await db.subtaskMark.create({
        data: { subtaskId, userId: user.id, dueDate: date, status: 'pending' },
      })
    }

    const updated = await db.subtaskMark.update({
      where: { id: mark.id },
      data: { status, markedAt: status === 'done' ? new Date() : null },
    })
    return NextResponse.json(serializeSubtaskMark(updated))
  } catch (e) {
    return errorResponse(e)
  }
}
