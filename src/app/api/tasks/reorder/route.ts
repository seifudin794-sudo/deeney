import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'

// Body: { ids: string[] } — reorder tasks within the same due date.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { ids } = await req.json()
    if (!Array.isArray(ids)) throw new ResponseError(400, 'ids must be an array')
    await db.$transaction(
      ids.map((id: string, i: number) =>
        db.task.updateMany({ where: { id, userId: user.id }, data: { sortOrder: i } }),
      ),
    )
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
