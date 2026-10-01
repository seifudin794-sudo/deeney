import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeTask, TASK_INCLUDE } from '@/lib/serialize'
import { addDays, occurrencesFor, parseDateOnly, todayDateOnly } from '@/lib/date'
import type { Priority, RecurrenceRule } from '@/lib/types'

function parseRecurrenceRule(v: string | undefined | null): RecurrenceRule | null {
  if (!v) return null
  return (['daily', 'weekdays', 'weekly', 'monthly'] as const).includes(v as RecurrenceRule)
    ? (v as RecurrenceRule)
    : null
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const url = req.nextUrl
    const from = url.searchParams.get('from') || undefined
    const to = url.searchParams.get('to') || undefined
    const status = url.searchParams.get('status') || undefined
    const categoryId = url.searchParams.get('categoryId') || undefined
    const priority = url.searchParams.get('priority') || undefined
    const q = url.searchParams.get('q') || undefined
    const recurring = url.searchParams.get('recurring') // 'true' | 'false'

    const where: any = { userId: user.id }
    if (from || to) {
      where.dueDate = {}
      if (from) where.dueDate.gte = from
      if (to) where.dueDate.lte = to
    }
    if (status) where.status = status
    if (categoryId) where.categoryId = categoryId
    if (priority) where.priority = priority
    if (q) where.title = { contains: q }
    if (recurring === 'true') where.parentRecurringId = { not: null }
    if (recurring === 'false') where.parentRecurringId = null

    const tasks = await db.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(tasks.map(serializeTask))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const {
      title,
      description,
      categoryId,
      priority = 'medium',
      dueDate,
      recurrenceRule,
      recurrenceWeekdays,
      subtasks = [],
    } = body || {}

    if (!title || !String(title).trim()) throw new ResponseError(400, 'Title is required')
    if (!dueDate) throw new ResponseError(400, 'Due date is required')
    const rule = parseRecurrenceRule(recurrenceRule)

    const maxOrder = await db.task.aggregate({
      where: { userId: user.id, dueDate },
      _max: { sortOrder: true },
    })
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1

    if (rule) {
      // Create a recurring template and generate upcoming occurrences.
      const template = await db.recurringTemplate.create({
        data: {
          userId: user.id,
          title: String(title).trim(),
          description: description || null,
          categoryId: categoryId || null,
          priority: priority as Priority,
          rule,
          weekdays: recurrenceWeekdays ? String(recurrenceWeekdays) : null,
          startDate: dueDate,
          isActive: true,
        },
      })
      const from = parseDateOnly(dueDate)
      const to = addDays(new Date(), 14)
      const dates = occurrencesFor(
        { rule, weekdays: recurrenceWeekdays ? String(recurrenceWeekdays) : null, startDate: dueDate, endDate: null },
        from,
        to,
      )
      for (const d of dates) {
        await db.task.create({
          data: {
            userId: user.id,
            title: template.title,
            description: template.description,
            categoryId: template.categoryId,
            priority: template.priority,
            dueDate: todayDateOnly() === parseDateOnlyStr(d) ? dueDate : parseDateOnlyStr(d),
            recurrenceRule: rule,
            recurrenceWeekdays: template.weekdays,
            parentRecurringId: template.id,
            sortOrder: await nextOrder(user.id, todayDateOnly() === parseDateOnlyStr(d) ? dueDate : parseDateOnlyStr(d)),
            subtasks: subtasks.length
              ? { create: subtasks.map((s: string, i: number) => ({ userId: user.id, title: s, sortOrder: i })) }
              : undefined,
          },
        })
      }
      return NextResponse.json({ ok: true, recurring: true, templateId: template.id })
    }

    const task = await db.task.create({
      data: {
        userId: user.id,
        title: String(title).trim(),
        description: description || null,
        categoryId: categoryId || null,
        priority: priority as Priority,
        dueDate,
        sortOrder,
        subtasks: subtasks.length
          ? { create: subtasks.map((s: string, i: number) => ({ userId: user.id, title: s, sortOrder: i })) }
          : undefined,
      },
      include: TASK_INCLUDE,
    })
    return NextResponse.json(serializeTask(task))
  } catch (e) {
    return errorResponse(e)
  }
}

function parseDateOnlyStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function nextOrder(userId: string, dueDate: string) {
  const max = await db.task.aggregate({ where: { userId, dueDate }, _max: { sortOrder: true } })
  return (max._max.sortOrder ?? -1) + 1
}
