import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { errorResponse, requireUser, ResponseError } from '@/lib/auth'
import { serializeRecurring } from '@/lib/serialize'
import type { Priority, RecurrenceRule } from '@/lib/types'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const body = await req.json()
    const t = await db.recurringTemplate.findUnique({ where: { id } })
    if (!t || t.userId !== user.id) throw new ResponseError(404, 'Template not found')
    const data: any = {}
    if (body.title !== undefined) data.title = String(body.title).trim()
    if (body.description !== undefined) data.description = body.description || null
    if (body.categoryId !== undefined) data.categoryId = body.categoryId || null
    if (body.priority !== undefined) data.priority = body.priority as Priority
    if (body.rule !== undefined) data.rule = body.rule as RecurrenceRule
    if (body.weekdays !== undefined) data.weekdays = body.weekdays ? String(body.weekdays) : null
    if (body.startDate !== undefined) data.startDate = body.startDate
    if (body.endDate !== undefined) data.endDate = body.endDate || null
    if (body.isActive !== undefined) data.isActive = !!body.isActive
    const updated = await db.recurringTemplate.update({ where: { id }, data, include: { category: true } })
    return NextResponse.json(serializeRecurring(updated))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser()
    const { id } = await ctx.params
    const t = await db.recurringTemplate.findUnique({ where: { id } })
    if (!t || t.userId !== user.id) throw new ResponseError(404, 'Template not found')
    await db.recurringTemplate.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
