import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeTask, TASK_INCLUDE } from '@/lib/serialize'

// Body: { completed: boolean }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const { completed } = await req.json()
    const task = await db.task.findUnique({ where: { id }, include: TASK_INCLUDE })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')

    if (completed) {
      const updated = await db.task.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date(), skipReason: null, skipLoggedAt: null },
        include: TASK_INCLUDE,
      })
      return NextResponse.json(serializeTask(updated))
    } else {
      const updated = await db.task.update({
        where: { id },
        data: { status: 'pending', completedAt: null },
        include: TASK_INCLUDE,
      })
      return NextResponse.json(serializeTask(updated))
    }
  } catch (e) {
    return errorResponse(e)
  }
}
