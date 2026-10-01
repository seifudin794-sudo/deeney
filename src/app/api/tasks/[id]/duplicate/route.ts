import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeTask, TASK_INCLUDE } from '@/lib/serialize'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const task = await db.task.findUnique({ where: { id }, include: TASK_INCLUDE })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')
    const max = await db.task.aggregate({ where: { userId: user.id, dueDate: task.dueDate }, _max: { sortOrder: true } })
    const copy = await db.task.create({
      data: {
        userId: user.id,
        title: task.title,
        description: task.description,
        categoryId: task.categoryId,
        priority: task.priority,
        dueDate: task.dueDate,
        status: 'pending',
        sortOrder: (max._max.sortOrder ?? -1) + 1,
        subtasks: task.subtasks.length
          ? { create: task.subtasks.map((s, i) => ({ userId: user.id, title: s.title, sortOrder: i })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    })
    return NextResponse.json(serializeTask(copy))
  } catch (e) {
    return errorResponse(e)
  }
}
