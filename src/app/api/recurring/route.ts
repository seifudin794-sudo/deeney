import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeRecurring } from '@/lib/serialize'
import { addDays, occurrencesFor, parseDateOnly, parseDateOnlyStr } from '@/lib/date'
import type { Priority, RecurrenceRule } from '@/lib/types'

export async function GET() {
  try {
    const user = await requireUser()
    const list = await db.recurringTemplate.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(list.map(serializeRecurring))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const { title, description, categoryId, priority = 'medium', rule, weekdays, startDate, endDate } = body || {}
    if (!title || !String(title).trim()) throw new ResponseError(400, 'Title is required')
    if (!rule || !['daily', 'weekdays', 'weekly', 'monthly'].includes(rule)) {
      throw new ResponseError(400, 'A valid rule is required')
    }
    if (!startDate) throw new ResponseError(400, 'Start date is required')

    const template = await db.recurringTemplate.create({
      data: {
        userId: user.id,
        title: String(title).trim(),
        description: description || null,
        categoryId: categoryId || null,
        priority: priority as Priority,
        rule: rule as RecurrenceRule,
        weekdays: weekdays ? String(weekdays) : null,
        startDate,
        endDate: endDate || null,
        isActive: true,
      },
      include: { category: true },
    })

    await generateOccurrences(template)
    return NextResponse.json(serializeRecurring(template))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function generateOccurrences(t: any) {
  const from = parseDateOnly(t.startDate)
  const to = addDays(new Date(), 14)
  if (from > to) return
  const dates = occurrencesFor(
    { rule: t.rule, weekdays: t.weekdays, startDate: t.startDate, endDate: t.endDate },
    from,
    to,
  )
  for (const d of dates) {
    const due = parseDateOnlyStr(d)
    const exists = await db.task.findFirst({
      where: { parentRecurringId: t.id, dueDate: due, userId: t.userId },
    })
    if (exists) continue
    const max = await db.task.aggregate({ where: { userId: t.userId, dueDate: due }, _max: { sortOrder: true } })
    await db.task.create({
      data: {
        userId: t.userId,
        title: t.title,
        description: t.description,
        categoryId: t.categoryId,
        priority: t.priority,
        dueDate: due,
        recurrenceRule: t.rule,
        recurrenceWeekdays: t.weekdays,
        parentRecurringId: t.id,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    })
  }
}
