import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  createSession,
  errorResponse,
  hashPassword,
  setSessionCookie,
  ResponseError,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()
    if (!email || !password) throw new ResponseError(400, 'Email and password are required')
    if (password.length < 6) throw new ResponseError(400, 'Password must be at least 6 characters')
    const normalized = String(email).trim().toLowerCase()
    const existing = await db.user.findUnique({ where: { email: normalized } })
    if (existing) throw new ResponseError(409, 'An account with this email already exists')
    const user = await db.user.create({
      data: {
        email: normalized,
        name: name || normalized.split('@')[0],
        passwordHash: hashPassword(password),
        provider: 'credentials',
      },
    })
    await seedDefaults(user.id)
    const token = await createSession(user.id)
    await setSessionCookie(token)
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, provider: user.provider },
    })
  } catch (e) {
    return errorResponse(e)
  }
}

async function seedDefaults(userId: string) {
  const count = await db.category.count({ where: { userId } })
  if (count > 0) return
  const colors = ['#f59e0b', '#8b5cf6', '#14b8a6']
  const names = ['Work', 'Content', 'Personal']
  await db.category.createMany({
    data: names.map((n, i) => ({ userId, name: n, color: colors[i] })),
  })
}
