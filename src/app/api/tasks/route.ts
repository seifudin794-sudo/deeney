import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeTask, TASK_INCLUDE } from '@/lib/serialize'
import type { Priority, RepeatType } from '@/lib/types'
import type { TaskInput } from '@/lib/api'

export async function GET() {
  try {
    const user = await requireUser()
    const list = await db.task.findMany({
      where: { userId: user.id },
      include: TASK_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(list.map(serializeTask))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = (await req.json()) as TaskInput
    const { name, categoryId, priority = 'medium', repeatType = 'daily', startDate, time, subtasks = [] } = body
    if (!name || !String(name).trim()) throw new ResponseError(400, 'Task name is required')
    if (!startDate) throw new ResponseError(400, 'Start date is required')

    const max = await db.task.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } })
    const sortOrder = (max._max.sortOrder ?? -1) + 1

    const task = await db.task.create({
      data: {
        userId: user.id,
        name: String(name).trim(),
        categoryId: categoryId || null,
        priority: priority as Priority,
        repeatType: repeatType as RepeatType,
        startDate,
        time: time || null,
        sortOrder,
        subtasks: subtasks.length
          ? { create: subtasks.map((s, i) => ({ userId: user.id, title: s.title, sortOrder: i })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    })
    return NextResponse.json(serializeTask(task))
  } catch (e) {
    return errorResponse(e)
  }
}
