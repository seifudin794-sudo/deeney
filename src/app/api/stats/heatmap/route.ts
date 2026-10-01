import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { addDays, parseDateOnlyStr } from '@/lib/date'

// Last 12 months daily activity: completed + skipped counts per day.
export async function GET() {
  try {
    const user = await requireUser()
    const from = addDays(new Date(), -364)
    const tasks = await db.task.findMany({
      where: { userId: user.id, dueDate: { gte: parseDateOnlyStr(from) } },
      select: { dueDate: true, status: true },
    })
    const map = new Map<string, { completed: number; skipped: number; pending: number }>()
    for (let i = 0; i < 365; i++) {
      const d = addDays(from, i)
      map.set(parseDateOnlyStr(d), { completed: 0, skipped: 0, pending: 0 })
    }
    for (const t of tasks) {
      const e = map.get(t.dueDate)
      if (!e) continue
      if (t.status === 'completed') e.completed++
      else if (t.status === 'skipped') e.skipped++
      else e.pending++
    }
    return NextResponse.json(Array.from(map.entries()).map(([date, v]) => ({ date, ...v })))
  } catch (e) {
    return errorResponse(e)
  }
}
