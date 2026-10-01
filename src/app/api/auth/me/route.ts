import { NextResponse } from 'next/server'
import { errorResponse, getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ user: null })
    return NextResponse.json({ user })
  } catch (e) {
    return errorResponse(e)
  }
}
