import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'

export const SESSION_COOKIE = 'journal_session'
const SESSION_DAYS = 30

// ---- password hashing (node scrypt, no extra deps) ----
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hash] = parts
  const test = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'))
}

// ---- session token ----
export function newSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { userId, token, expiresAt } })
  return token
}

export async function setSessionCookie(token: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export type SafeUser = {
  id: string
  email: string
  name: string | null
  provider: string
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      provider: session.user.provider,
    }
  } catch {
    return null
  }
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser()
  if (!user) throw new ResponseError(401, 'Unauthorized')
  return user
}

export class ResponseError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof ResponseError) {
    return Response.json({ error: e.message }, { status: e.status })
  }
  console.error('API error', e)
  return Response.json({ error: 'Something went wrong' }, { status: 500 })
}
