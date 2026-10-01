import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser } from '@/lib/auth'
import { generateOccurrences } from '@/app/api/recurring/route'

// Generate upcoming occurrences (next 14 days) for every active template.
export async function POST() {
  try {
    const user = await requireUser()
    const templates = await db.recurringTemplate.findMany({
      where: { userId: user.id, isActive: true },
    })
    for (const t of templates) {
      await generateOccurrences(t)
    }
    return NextResponse.json({ ok: true, generated: templates.length })
  } catch (e) {
    return errorResponse(e)
  }
}
