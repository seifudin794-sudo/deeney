import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { TASK_INCLUDE } from '@/lib/serialize'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
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
    const recurring = url.searchParams.get('recurring')

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
      orderBy: [{ dueDate: 'asc' }, { sortOrder: 'asc' }],
    })

    const header = [
      'Date',
      'Task',
      'Category',
      'Priority',
      'Subtasks',
      'Subtask detail',
      'Status',
      'Completed at',
      'Skip reason',
      'Recurring',
    ]
    const rows = tasks.map((t) => {
      const done = t.subtasks.filter((s) => s.isDone).length
      const total = t.subtasks.length
      const detail = t.subtasks.map((s) => `${s.isDone ? '[x]' : '[ ]'} ${s.title}`).join(' | ')
      return [
        t.dueDate,
        t.title,
        t.category?.name || '',
        t.priority,
        total ? `${done}/${total}` : '',
        detail,
        t.status,
        t.completedAt ? new Date(t.completedAt).toISOString() : '',
        t.skipReason || '',
        t.parentRecurringId ? 'yes' : 'no',
      ]
    })

    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tasks-${Date.now()}.csv"`,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
