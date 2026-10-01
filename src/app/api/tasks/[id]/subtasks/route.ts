import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeSubtask } from '@/lib/serialize'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const { title } = await req.json()
    if (!title || !String(title).trim()) throw new ResponseError(400, 'Title is required')
    const task = await db.task.findUnique({ where: { id } })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')
    const max = await db.subtask.aggregate({ where: { taskId: id }, _max: { sortOrder: true } })
    const sub = await db.subtask.create({
      data: { taskId: id, userId: user.id, title: String(title).trim(), sortOrder: (max._max.sortOrder ?? -1) + 1 },
    })
    return NextResponse.json(serializeSubtask(sub))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const { ids } = await req.json()
    if (Array.isArray(ids)) {
      await db.$transaction(
        ids.map((sid: string, i: number) =>
          db.subtask.updateMany({ where: { id: sid, userId: user.id }, data: { sortOrder: i } }),
        ),
      )
      return NextResponse.json({ ok: true })
    }
    const body = await req.json()
    if (body.title !== undefined) {
      const sub = await db.subtask.findUnique({ where: { id } })
      if (!sub || sub.userId !== user.id) throw new ResponseError(404, 'Subtask not found')
      const updated = await db.subtask.update({ where: { id }, data: { title: String(body.title).trim() } })
      return NextResponse.json(serializeSubtask(updated))
    }
    throw new ResponseError(400, 'Invalid request')
  } catch (e) {
    return errorResponse(e)
  }
}
