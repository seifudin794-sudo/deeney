import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeSubtask } from '@/lib/serialize'

// Body: { isDone: boolean }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const { isDone } = await req.json()
    const sub = await db.subtask.findUnique({ where: { id } })
    if (!sub || sub.userId !== user.id) throw new ResponseError(404, 'Subtask not found')
    const updated = await db.subtask.update({
      where: { id },
      data: { isDone: !!isDone, doneAt: isDone ? new Date() : null },
    })
    return NextResponse.json(serializeSubtask(updated))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const sub = await db.subtask.findUnique({ where: { id } })
    if (!sub || sub.userId !== user.id) throw new ResponseError(404, 'Subtask not found')
    await db.subtask.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
