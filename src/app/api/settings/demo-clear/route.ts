import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'

// Clears all task/subtask data (keeps the account + categories) so the user can
// start fresh after previewing the dashboard.
export async function POST() {
  try {
    const user = await requireUser()
    await db.task.deleteMany({ where: { userId: user.id } })
    await db.recurringTemplate.deleteMany({ where: { userId: user.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
