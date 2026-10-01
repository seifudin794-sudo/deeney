import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { clearSessionCookie, errorResponse, getCurrentUser } from '@/lib/auth'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (user) {
      await db.session.deleteMany({ where: { userId: user.id } }).catch(() => {})
    }
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
