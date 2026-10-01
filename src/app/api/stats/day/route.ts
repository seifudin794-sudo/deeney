import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { serializeTask, TASK_INCLUDE } from '@/lib/serialize'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser()
    const date = req.nextUrl.searchParams.get('date')
    if (!date) return NextResponse.json({ tasks: [] })
    const tasks = await db.task.findMany({
      where: { userId: user.id, dueDate: date },
      include: TASK_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ tasks: tasks.map(serializeTask) })
  } catch (e) {
    return errorResponse(e)
  }
}
