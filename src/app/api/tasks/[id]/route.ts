import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeTask, TASK_INCLUDE } from '@/lib/serialize'
import type { Priority, RepeatType } from '@/lib/types'
import type { TaskInput } from '@/lib/api'

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
    const body = (await req.json()) as TaskInput
    const { name, categoryId, priority, repeatType, startDate, time, subtasks } = body
    const task = await db.task.findUnique({ where: { id }, include: TASK_INCLUDE })
    if (!task || task.userId !== user.id) throw new ResponseError(404, 'Task not found')

    // Sync subtasks: keep existing by id, add new, remove missing.
    if (subtasks) {
      const incomingIds = new Set(subtasks.filter((s) => s.id).map((s) => s.id))
      for (const existing of task.subtasks) {
        if (!incomingIds.has(existing.id)) {
          await db.subtask.delete({ where: { id: existing.id } })
        }
      }
      const ordered = subtasks.map((s, i) => ({ ...s, sortOrder: i }))
      for (const s of ordered) {
        if (s.id) {
          await db.subtask.update({ where: { id: s.id }, data: { title: s.title, sortOrder: s.sortOrder } })
        } else {
          await db.subtask.create({ data: { taskId: id, userId: user.id, title: s.title, sortOrder: s.sortOrder } })
        }
      }
    }

    const updated = await db.task.update({
      where: { id },
      data: {
        name: String(name).trim(),
        categoryId: categoryId || null,
        priority: (priority as Priority) ?? task.priority,
        repeatType: (repeatType as RepeatType) ?? task.repeatType,
        startDate: startDate ?? task.startDate,
        time: time !== undefined ? (time || null) : task.time,
      },
      include: TASK_INCLUDE,
    })
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
