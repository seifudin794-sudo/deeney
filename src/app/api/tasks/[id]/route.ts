import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeTask, TASK_INCLUDE } from '@/lib/serialize'
import type { Priority } from '@/lib/types'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const task = await db.task.findUnique({ where: { id }, include: TASK_INCLUDE })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')
    return NextResponse.json(serializeTask(task))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const body = await req.json()
    const task = await db.task.findUnique({ where: { id } })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')

    const data: any = {}
    if (body.title !== undefined) data.title = String(body.title).trim()
    if (body.description !== undefined) data.description = body.description || null
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null
    if (body.priority !== undefined) data.priority = body.priority as Priority
    if (body.dueDate !== undefined) data.dueDate = body.dueDate
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

    const updated = await db.task.update({ where: { id }, data, include: TASK_INCLUDE })
    return NextResponse.json(serializeTask(updated))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const task = await db.task.findUnique({ where: { id } })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')
    await db.task.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
