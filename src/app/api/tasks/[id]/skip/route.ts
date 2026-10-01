import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeTask, TASK_INCLUDE } from '@/lib/serialize'

// Body: { reason: string, rescheduleTo?: string }
// Marks the task skipped with a reason (min 5 chars). If rescheduleTo is given,
// creates a new pending copy on that date and keeps the skipped original.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const { reason, rescheduleTo } = await req.json()
    const reasonStr = String(reason || '').trim()
    if (reasonStr.length < 5) {
      throw new ResponseError(400, 'Please write a reason of at least 5 characters')
    }
    const task = await db.task.findUnique({ where: { id }, include: TASK_INCLUDE })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')

    const updated = await db.task.update({
      where: { id },
      data: { status: 'skipped', skipReason: reasonStr, skipLoggedAt: new Date(), completedAt: null },
      include: TASK_INCLUDE,
    })

    let copy: any = null
    if (rescheduleTo) {
      const max = await db.task.aggregate({ where: { userId: user.id, dueDate: rescheduleTo }, _max: { sortOrder: true } })
      copy = await db.task.create({
        data: {
          userId: user.id,
          title: task.title,
          description: task.description,
          categoryId: task.categoryId,
          priority: task.priority,
          dueDate: rescheduleTo,
          status: 'pending',
          recurrenceRule: task.recurrenceRule,
          recurrenceWeekdays: task.recurrenceWeekdays,
          parentRecurringId: task.parentRecurringId,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
          subtasks: task.subtasks.length
            ? { create: task.subtasks.map((s, i) => ({ userId: user.id, title: s.title, sortOrder: i })) }
            : undefined,
        },
        include: TASK_INCLUDE,
      })
    }
    return NextResponse.json({ task: serializeTask(updated), copy: copy ? serializeTask(copy) : null })
  } catch (e) {
    return errorResponse(e)
  }
}
