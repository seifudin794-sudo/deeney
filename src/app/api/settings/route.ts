import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireUser()
    const s = await db.settings.findUnique({ where: { userId: user.id } })
    return NextResponse.json(
      s ?? { theme: 'system', weekStartsOn: 1, timezone: 'Africa/Nairobi', onboardingDone: false },
    )
  } catch (e) {
    return errorResponse(e)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const data: any = {}
    if (body.theme !== undefined) data.theme = body.theme
    if (body.weekStartsOn !== undefined) data.weekStartsOn = body.weekStartsOn
    if (body.timezone !== undefined) data.timezone = body.timezone
    if (body.onboardingDone !== undefined) data.onboardingDone = body.onboardingDone
    const s = await db.settings.upsert({
      where: { userId: user.id },
      update: data,
      create: { userId: user.id, ...data },
    })
    return NextResponse.json(s)
  } catch (e) {
    return errorResponse(e)
  }
}
