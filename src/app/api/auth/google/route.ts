import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, errorResponse, setSessionCookie } from '@/lib/auth'

// One-click "Continue with Google". In production this would redirect through
// Google OAuth; in this sandbox it provisions a local demo Google account so
// the full app can be experienced without external credentials.
const DEMO_EMAIL = 'you@gmail.demo'

export async function POST() {
  try {
    let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } })
    if (!user) {
      user = await db.user.create({
        data: {
          email: DEMO_EMAIL,
          name: 'You',
          provider: 'google',
          settings: { create: {} },
        },
      })
      const colors = ['#f59e0b', '#8b5cf6', '#14b8a6']
      const names = ['Work', 'Content', 'Personal']
      await db.category.createMany({
        data: names.map((n, i) => ({ userId: user!.id, name: n, color: colors[i] })),
      })
    }
    const token = await createSession(user.id)
    await setSessionCookie(token)
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, provider: user.provider },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
