import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  createSession,
  errorResponse,
  hashPassword,
  setSessionCookie,
  ResponseError,
  verifyPassword,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) throw new ResponseError(400, 'Email and password are required')
    const normalized = String(email).trim().toLowerCase()
    const user = await db.user.findUnique({ where: { email: normalized } })
    if (!user || !user.passwordHash) {
      throw new ResponseError(401, 'Invalid email or password')
    }
    if (!verifyPassword(password, user.passwordHash)) {
      throw new ResponseError(401, 'Invalid email or password')
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

export async function seedDefaultsIfNeeded(userId: string) {
  const count = await db.category.count({ where: { userId } })
  if (count === 0) {
    const colors = ['#f59e0b', '#8b5cf6', '#14b8a6']
    const names = ['Work', 'Content', 'Personal']
    await db.category.createMany({
      data: names.map((n, i) => ({ userId, name: n, color: colors[i] })),
    })
  }
}
